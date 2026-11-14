import { PhotoReview } from "@/components/photo-review";
import Link from "next/link";
import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { SectionHeading } from "@/components/section";
import { GreenForm } from "@/components/green-forms";
import {
  caseSelect,
  activeStatuses,
  priority,
  matches,
} from "@/lib/analysis/rules";
import { vision } from "@/lib/analysis/vision";
import { labels } from "@/lib/workflow";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ report?: string; tree?: string }>;
}) {
  const role = await demoRole(),
    provider = await vision.status();
  const heading = (
    <SectionHeading
      title="AI Workspace"
      description="Разбор обращений и проверка рекомендаций оператором."
    />
  );
  if (role !== "OPERATOR")
    return (
      <>
        {heading}
        <section className="panel form-card">
          <h2>{provider.label}</h2>
          <p>Для разбора очереди выберите DEMO ROLE «Оператор».</p>
        </section>
      </>
    );
  const rows = await db.report.findMany({
    select: {
      ...caseSelect,
      title: true,
      photos: true,
      status: true,
      decisions: {
        include: { actor: { select: { name: true } } },
        orderBy: { id: "desc" },
      },
    },
  });
  const queue = rows
    .filter((r) => activeStatuses.includes(r.status))
    .map((r) => ({ r, p: priority(r, rows) }))
    .sort((a, b) => b.p.score - a.p.score || +a.r.createdAt - +b.r.createdAt);
  const query = await searchParams;
  const trees = await db.tree.findMany({
    where: { photo: { not: null } },
    select: { id: true, species: true, photo: true },
  });
  const tree = trees.find((t) => t.id === Number(query.tree));
  const selected = Number(query.report);
  const current = queue.find((x) => x.r.id === selected) ?? queue[0];
  const hits = current ? matches(current.r, rows) : [];
  return (
    <>
      {heading}
      <div
        className="panel form-card provider-status"
        data-ready={provider.ready}
      >
        <small>Локальный анализ фотографий</small>
        <h2>{provider.label}</h2>
        <p>
          {provider.ready
            ? "Фотографии обрабатываются на CPU этого компьютера. Категорию подтверждает оператор."
            : "Доступна ручная оценка фото в карточках обращений и деревьев."}
        </p>
      </div>
      {trees.length > 0 && (
        <section className="panel form-card">
          <h2>Фотографии деревьев</h2>
          <form>
            <label>
              Дерево
              <select name="tree" defaultValue={tree?.id ?? ""}>
                <option value="">Выберите дерево</option>
                {trees.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.species} №{t.id}
                  </option>
                ))}
              </select>
            </label>
            <button className="button">Открыть фото</button>
          </form>
          {tree?.photo && (
            <>
              <img
                className="evidence"
                src={"/api/photos/" + tree.photo}
                alt={tree.species}
              />
              <PhotoReview
                workspace
                object="tree"
                operator
                id={tree.id}
                image={tree.photo}
              />
            </>
          )}
        </section>
      )}
      <div className="detail-grid ai-grid">
        <section className="panel form-card">
          <h2>Очередь обращений · {queue.length}</h2>
          {queue.map(({ r, p }) => (
            <Link
              className={
                "queue-row " + (r.id === current?.r.id ? "chosen" : "")
              }
              key={r.id}
              href={"/ai-workspace?report=" + r.id}
            >
              <span className={"priority " + p.level}>{p.level}</span>
              <strong>{r.title}</strong>
              <small>
                №{r.id} · {labels[r.status]}
              </small>
            </Link>
          ))}
          {!queue.length && <p>Активных обращений нет.</p>}
        </section>
        {current && (
          <div className="detail-side">
            <section className="panel form-card">
              <Link className="text-link" href={"/reports/" + current.r.id}>
                Открыть обращение №{current.r.id} →
              </Link>
              <h2>{current.r.title}</h2>
              <p>{current.r.description}</p>
              <h3>Предлагаемый приоритет · {current.p.level}</h3>
              <small>
                Rule-based scoring · сумма баллов по фиксированным правилам.
              </small>
              <ul>
                {current.p.reasons.map((r) => (
                  <li key={r.label}>
                    +{r.points} · {r.label}
                  </li>
                ))}
              </ul>
              <p>
                Итого {current.p.score}. LOW до 3, MEDIUM от 3, HIGH от 6,
                CRITICAL от 9.
              </p>
              <GreenForm
                endpoint="/api/analysis"
                action="priority"
                label="Подтвердить приоритет"
                id={current.r.id}
              >
                <input type="hidden" name="expected" value={current.p.level} />
              </GreenForm>
            </section>
            <section className="panel form-card">
              <h2>Фото обращения №{current.r.id}</h2>
              {current.r.photos.map((p) => (
                <div key={p.id}>
                  <img
                    className="evidence"
                    src={"/api/photos/" + p.filename}
                    alt="Фото обращения"
                  />
                  <PhotoReview
                    workspace
                    operator
                    object="report"
                    id={current.r.id}
                    image={p.filename}
                  />
                </div>
              ))}
              {provider.ready && (
                <GreenForm
                  id={current.r.id}
                  action="attach-classify"
                  endpoint="/api/analysis"
                  label="Анализировать фото"
                  pendingLabel="Обработка фотографии на CPU…"
                >
                  <label>
                    Прикрепить новое фото к этому обращению
                    <input
                      name="photo"
                      type="file"
                      required
                      accept="image/jpeg,image/png,image/webp"
                    />
                  </label>
                  <input type="hidden" name="workspace" value="1" />
                  <small>
                    До 5 МБ. Результат предварительный. Диагностика болезней
                    требует осмотра специалиста.
                  </small>
                </GreenForm>
              )}
            </section>
            <section className="panel form-card">
              <h2>Возможные повторы · {hits.length}</h2>
              {hits.map((m) => (
                <GreenForm
                  key={m.id}
                  endpoint="/api/analysis"
                  action="duplicate"
                  label="Сохранить решение"
                  id={current.r.id}
                >
                  <Link className="text-link" href={"/reports/" + m.id}>
                    Обращение №{m.id} →
                  </Link>
                  <p>
                    Та же категория · {m.distance} м · разница {m.days} дн. ·
                    совпадение слов {m.similarity}%
                  </p>
                  <input type="hidden" name="candidateId" value={m.id} />
                  <label>
                    Решение
                    <select name="verdict">
                      <option>Возможный повтор подтверждён</option>
                      <option>Совпадение отклонено</option>
                    </select>
                  </label>
                </GreenForm>
              ))}
              {!hits.length && <p>Совпадений по правилам нет.</p>}
            </section>
            <section className="panel form-card">
              <h2>История решений</h2>
              {current.r.decisions.map((d) => (
                <div key={d.id}>
                  <b>{d.value}</b>
                  <p>{d.explanation}</p>
                  <small>
                    {d.source} · {d.actor.name} ·{" "}
                    {d.createdAt.toLocaleString("ru-RU", {
                      timeZone: "Asia/Qyzylorda",
                    })}
                  </small>
                </div>
              ))}
              {!current.r.decisions.length && <p>Решений пока нет.</p>}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
