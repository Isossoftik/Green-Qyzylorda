import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { actors, labels, date } from "@/lib/workflow";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionHeading } from "./section";
import { PhotoReview } from "./photo-review";
import { Actions } from "./workflow-forms";
export async function CaseDetail({
  id,
  taskView = false,
  created = false,
}: {
  id: string;
  taskView?: boolean;
  created?: boolean;
}) {
  const key = Number(id);
  if (!Number.isSafeInteger(key) || key <= 0) notFound();
  const role = await demoRole();
  const report = await db.report.findFirst({
    where: taskView ? { task: { id: key } } : { id: key },
    include: {
      photos: true,
      task: { include: { assignee: true } },
      history: { include: { actor: true }, orderBy: { id: "desc" } },
    },
  });
  if (
    !report ||
    (taskView &&
      (role === "RESIDENT" ||
        (role === "EXECUTOR" && report.task?.assigneeId !== actors.EXECUTOR)))
  )
    notFound();
  const task = report.task,
    users = await db.user.findMany({
      where: { role: "EXECUTOR" },
      select: { id: true, name: true },
    });
  const owned =
    role === "EXECUTOR"
      ? task?.assigneeId === actors.EXECUTOR
      : role === "RESIDENT"
        ? report.authorId === actors.RESIDENT
        : true;
  return (
    <>
      <Link className="text-link" href={taskView ? "/tasks" : "/reports"}>
        ← {taskView ? "Задания" : "Обращения"}
      </Link>
      <SectionHeading
        title={(taskView ? "Задание №" : "Обращение №") + key}
        description={report.title}
      />
      {created && (
        <p role="status" className="success-msg">
          Обращение зарегистрировано
        </p>
      )}
      {role === "OPERATOR" && (
        <Link className="text-link" href={"/ai-workspace?report=" + report.id}>
          Приоритет и возможные повторы →
        </Link>
      )}
      <div className="detail-grid">
        <section className="panel form-card">
          <h2>{report.title}</h2>
          <span className="status" data-state={report.status}>{labels[report.status]}</span>
          <dl>
            <dt>Категория</dt>
            <dd>{report.category}</dd>
            {report.treeId && (
              <>
                <dt>Связанное дерево</dt>
                <dd>
                  <Link
                    className="text-link"
                    href={"/green-fund/trees/" + report.treeId}
                  >
                    №{report.treeId}
                  </Link>
                </dd>
              </>
            )}
            <dt>Описание</dt>
            <dd>{report.description}</dd>
            <dt>Адрес</dt>
            <dd>
              {report.address} · {report.lat.toFixed(5)},{" "}
              {report.lng.toFixed(5)}
            </dd>
            <dt>Контакт заявителя</dt>
            <dd>{report.contact}</dd>
            <dt>Зарегистрировано</dt>
            <dd>{date(report.createdAt)}</dd>
            {report.clarification && (
              <>
                <dt>Запрос уточнения</dt>
                <dd>{report.clarification}</dd>
              </>
            )}
            {task && (
              <>
                <dt>Исполнитель и срок</dt>
                <dd>
                  {task.assignee.name} · {date(task.dueAt)}
                </dd>
                {task.comment && (
                  <>
                    <dt>Комментарий исполнителя</dt>
                    <dd>{task.comment}</dd>
                  </>
                )}
                {role !== "RESIDENT" && (
                  <dd>
                    <Link
                      className="text-link"
                      href={
                        taskView ? "/reports/" + report.id : "/tasks/" + task.id
                      }
                    >
                      {taskView ? "Открыть обращение" : "Открыть задание"} →
                    </Link>
                  </dd>
                )}
              </>
            )}
          </dl>
          {report.photos.map((p) => (
            <figure key={p.id}>
              <a
                href={"/api/photos/" + p.filename}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  className="evidence"
                  src={"/api/photos/" + p.filename}
                  alt={
                    p.kind === "RESULT" ? "Фото результата" : "Фото обращения"
                  }
                />
              </a>
              <figcaption>
                {p.kind === "RESULT" ? "Результат работ" : "При регистрации"}
              </figcaption>
              <PhotoReview
                id={report.id}
                object="report"
                image={p.filename}
                operator={role === "OPERATOR"}
              />
            </figure>
          ))}
        </section>
        <div className="detail-side">
          <Actions
            {...{
              role,
              id: report.id,
              status: report.status,
              clarification: report.clarification,
              version: report.version,
              owned,
              users,
            }}
          />
          <section className="panel form-card">
            <h2>История действий</h2>
            <ol className="timeline">
              {report.history.map((h) => (
                <li key={h.id}>
                  <b>{labels[h.toStatus]}</b>
                  <p>{h.message}</p>
                  <small>
                    {h.actor.name} ·{" "}
                    {h.createdAt.toLocaleString("ru-RU", {
                      timeZone: "Asia/Qyzylorda",
                    })}
                  </small>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
