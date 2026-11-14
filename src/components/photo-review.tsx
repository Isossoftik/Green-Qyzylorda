import { db } from "@/lib/db";
import { vision, photoLabels } from "@/lib/analysis/vision";
import { GreenForm } from "./green-forms";
export async function PhotoReview({
  image,
  id,
  object,
  operator,
  workspace = false,
}: {
  image: string;
  id: number;
  object: "tree" | "report";
  operator: boolean;
  workspace?: boolean;
}) {
  const [status, history] = await Promise.all([
    vision.status(),
    db.reviewDecision.findMany({
      where: {
        image,
        kind: "PHOTO",
        ...(object === "tree" ? { treeId: id } : { reportId: id }),
      },
      orderBy: { id: "desc" },
    }),
  ]);
  const hidden = (
    <>
      {workspace && <input type="hidden" name="workspace" value="1" />}
      <input type="hidden" name="image" value={image} />
      <input type="hidden" name="object" value={object} />
    </>
  );
  return (
    <section className="photo-review">
      <h3>Оценка фотографии</h3>
      <p>{status.label}</p>
      <small>
        Предварительная визуальная категория. Для оценки состояния дерева нужен
        осмотр специалиста.
      </small>
      {history.map((d) => (
        <div key={d.id}>
          <strong>{d.value}</strong> · {d.source}
          <p>{d.explanation}</p>
          <p>Действие: {d.action}</p>
        </div>
      ))}
      {operator && (
        <>
          {status.ready && (
            <GreenForm
              action="classify"
              id={id}
              endpoint="/api/analysis"
              label="Анализировать фото"
              pendingLabel="Анализ на CPU…"
            >
              {hidden}
            </GreenForm>
          )}
          <details>
            <summary>Подтвердить или исправить категорию</summary>
            <GreenForm
              action="photo-review"
              id={id}
              endpoint="/api/analysis"
              label="Сохранить оценку"
            >
              {hidden}
              <label>
                Категория
                <select name="category" defaultValue={history[0]?.value}>
                  {photoLabels.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Обоснование
                <textarea required minLength={3} name="reason" />
              </label>
              <label>
                Предлагаемое действие
                <input
                  required
                  minLength={3}
                  name="next"
                  defaultValue={history[0]?.action ?? ""}
                />
              </label>
            </GreenForm>
          </details>
        </>
      )}
    </section>
  );
}
