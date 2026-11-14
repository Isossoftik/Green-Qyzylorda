import { db } from "./db";
import { fund, overdue, type GreenPin } from "./green";
import { labels } from "./workflow";
export async function fundData() {
  const [trees, zones, tasks] = await db.$transaction([
    db.tree.findMany({ include: { zone: true }, orderBy: { id: "desc" } }),
    db.zone.findMany({
      include: { crew: true, _count: { select: { trees: true } } },
      orderBy: { id: "desc" },
    }),
    db.task.findMany({
      where: { reportId: null },
      include: { tree: true, zone: true, assignee: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);
  return { trees, zones, tasks };
}
export async function greenPins(): Promise<GreenPin[]> {
  const { trees, zones, tasks } = await fundData();
  return [
    ...trees.map((t) => ({
      name: t.species + " №" + t.id,
      lat: t.lat,
      lng: t.lng,
      condition: t.condition,
      kind: "tree" as const,
      detail: t.condition,
      href: fund + "/trees/" + t.id,
    })),
    ...zones.map((z) => ({
      name: z.name,
      lat: z.lat,
      lng: z.lng,
      kind: "green" as const,
      detail: z.kind + " · " + z.condition,
      href: fund + "/zones/" + z.id,
    })),
    ...tasks.map((t) => {
      const object = (t.tree ?? t.zone)!;
      return {
        name: t.workType + " №" + t.id,
        lat: object.lat,
        lng: object.lng,
        kind: "task" as const,
        detail: labels[t.status] + (overdue(t) ? " · просрочено" : ""),
        href: fund + "/work/" + t.id,
      };
    }),
  ];
}
export async function fundStats() {
  const { trees, zones, tasks } = await fundData();
  return {
    total: trees.length,
    zones: zones.length,
    planned: tasks.filter((t) => t.status === "ASSIGNED").length,
    done: tasks.filter((t) => t.status === "CLOSED").length,
    late: tasks.filter((t) => overdue(t)).length,
    trees,
  };
}
