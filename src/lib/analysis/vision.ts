import { worker } from "./vision-worker";
export const photoLabels = [
  "Засохшее дерево",
  "Повреждение дерева",
  "Мусор на территории",
  "Проблема озеленения",
  "Неопределённая проблема",
];
const actions = [
  "Проверить жизнеспособность дерева на месте.",
  "Осмотреть ствол и ветви.",
  "Проверить участок и необходимость уборки.",
  "Осмотреть состояние насаждений.",
  "Запросить дополнительный снимок или осмотр.",
];
export interface VisionProvider {
  status(): Promise<{ ready: boolean; label: string }>;
  analyze(file: string): Promise<{
    category: string;
    explanation: string;
    action: string;
    source: string;
  }>;
}
export const vision: VisionProvider = {
  async status() {
    try {
      const state = await worker.status();
      if (state.ready) return { ready: true, label: state.model + " · CPU" };
    } catch {}
    return { ready: false, label: "AI не настроен" };
  },
  async analyze(file) {
    const result = await worker.analyze(file);
    const i = result.index;
    if (
      typeof i !== "number" ||
      !Number.isInteger(i) ||
      i < 0 ||
      i >= photoLabels.length
    )
      throw Error("Некорректный ответ модели");
    return {
      category: photoLabels[i],
      explanation:
        "Из пяти текстовых описаний модель выбрала ближайшее к изображению: «" +
        photoLabels[i] +
        "». Требуется проверка оператором.",
      action: actions[i],
      source: result.model,
    };
  },
};
