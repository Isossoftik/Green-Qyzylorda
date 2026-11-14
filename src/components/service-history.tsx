import Link from "next/link";
import { labels, date } from "@/lib/workflow";
import { fund } from "@/lib/green";
import type { Task, ServiceEvent } from "@prisma/client";
export function ServiceHistory({
  tasks,
}: {
  tasks: (Task & { events: (ServiceEvent & { actor: { name: string } })[] })[];
}) {
  const events = tasks
    .flatMap((task) => task.events.map((e) => ({ ...e, task })))
    .sort((a, b) => b.id - a.id);
  return (
    <section className="panel form-card">
      <h2>История обслуживания</h2>
      {!events.length && (
        <p className="hint">Работы ещё не зарегистрированы.</p>
      )}
      <ol className="timeline">
        {events.map((e) => (
          <li key={e.id}>
            <Link className="text-link" href={fund + "/work/" + e.taskId}>
              {e.task.workType} №{e.taskId} · {labels[e.status]}
            </Link>
            <p>{e.message}</p>
            <small>
              {date(e.createdAt)} · {e.actor.name}
            </small>
            {e.photo && (
              <a href={"/api/photos/" + e.photo}>
                <img
                  src={"/api/photos/" + e.photo}
                  className="evidence"
                  alt="Фотография результата"
                />
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
export const historyInclude = {
  events: { include: { actor: { select: { name: true } } } },
} as const;
