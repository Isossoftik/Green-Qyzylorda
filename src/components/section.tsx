import { Trees, ClipboardList, Settings2 } from "lucide-react";
import { DemoBadge } from "./dashboard";
export function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="title-row">
          <h1>{title}</h1>
          <DemoBadge />
        </div>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function Examples({
  icon,
  items,
  note,
}: {
  icon: "trees" | "tasks" | "settings";
  items: string[];
  note: string;
}) {
  const Icon = { trees: Trees, tasks: ClipboardList, settings: Settings2 }[
    icon
  ];
  return (
    <section className="panel examples">
      {items.map((item) => (
        <div key={item}>
          <Icon size={18} />
          {item}
        </div>
      ))}
      <p className="stage-note">{note}</p>
    </section>
  );
}
