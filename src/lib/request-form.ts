import { InputError } from "./mutations";

const limit = 6 * 1024 * 1024;

export async function requestForm(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== "http://" + request.headers.get("host"))
    throw new InputError("Недопустимый источник запроса.", 403);
  if (Number(request.headers.get("content-length")) > limit)
    throw new InputError("Слишком большой запрос.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Ожидается форма.");
  const chunks: ArrayBuffer[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        void reader.cancel().catch(() => {});
        throw new InputError("Слишком большой запрос.", 413);
      }
      chunks.push(new Uint8Array(value).buffer);
    }
    return await new Response(new Blob(chunks), { headers: {
      "Content-Type": request.headers.get("content-type") ?? "",
    }}).formData();
  } catch (e) {
    if (e instanceof InputError) throw e;
    throw new InputError("Не удалось прочитать форму.");
  } finally {
    reader.releaseLock();
  }
}
