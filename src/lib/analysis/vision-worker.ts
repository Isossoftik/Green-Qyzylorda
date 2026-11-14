import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import { existsSync,readFileSync } from "node:fs";
type Reply = {
  ready?: boolean;
  model: string;
  provider?: string;
  index?: number;
  error?: string;
};
type Pending = {
  resolve: (value: Reply) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
};
const dir = () => path.resolve(process.env.GREEN_CLIP_DIR || ".tools/vision");
class Worker {
  private child?: ChildProcessWithoutNullStreams;
  private ready?: Promise<Reply>;
  private pending?: Pending;
  private busy = false;
  private response(timeout: number) {
    return new Promise<Reply>((resolve, reject) => {
      this.pending = {
        resolve,
        reject,
        timer: setTimeout(
          () => this.stop(new Error("Истекло время обработки.")),
          timeout,
        ),
      };
    });
  }
  private stop(error: Error) {
    const child = this.child;
    this.child = undefined;
    this.ready = undefined;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = undefined;
    }
    child?.kill();
  }
  status() {
    if (this.ready) return this.ready;
    if (!existsSync(path.join(dir(), "model.onnx")))
      return Promise.reject(new Error("AI не настроен"));
    const interpreterFile=path.join(dir(),"python-path.txt");
    const child = spawn(
      process.env.GREEN_VISION_PYTHON ||
        (existsSync(interpreterFile)?readFileSync(interpreterFile,"utf8").trim():process.platform === "win32" ? "py" : "python3"),
      ["-I", "-u", path.resolve("scripts/local-vision.py"), dir()],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"], shell: false },
    );
    this.child = child;
    child.stderr.resume();
    const fail = () => {
      if (this.child === child)
        this.stop(new Error("Процесс модели недоступен."));
    };
    child.on("error", fail);
    child.on("exit", fail);
    child.stdin.on("error", fail);
    createInterface({ input: child.stdout }).on("line", (line) => {
      if (this.child !== child || !this.pending) return;
      try {
        const result = JSON.parse(line);
        const waiting = this.pending;
        clearTimeout(waiting.timer);
        this.pending = undefined;
        if (result.error)
          waiting.reject(new Error("Файл не удалось прочитать."));
        else waiting.resolve(result);
      } catch {
        this.stop(new Error("Некорректный ответ модели."));
      }
    });
    this.ready = this.response(30000).then((r) => {
      if (!r.ready || r.provider !== "CPUExecutionProvider") {
        this.stop(new Error("Ошибка загрузки модели."));
        throw Error("AI не настроен");
      }
      return r;
    });
    return this.ready;
  }
  async analyze(file: string) {
    if (this.busy)
      throw new Error("Модель занята. Повторите после завершения анализа.");
    this.busy = true;
    try {
      await this.status();
      const deadline = Number(process.env.GREEN_VISION_TIMEOUT_MS ?? 30000);
      const response = this.response(
        Math.max(
          1,
          Math.min(60000, Number.isFinite(deadline) ? deadline : 30000),
        ),
      );
      this.child!.stdin.write(JSON.stringify({ file }) + "\n");
      return await response;
    } finally {
      this.busy = false;
    }
  }
}
const globalWorker = globalThis as unknown as { greenVision?: Worker };
export const worker = (globalWorker.greenVision ??= new Worker());
