import type { Prisma, CareSchedule } from "@prisma/client";
import { dayKey } from "../green";
export async function generate(
  tx: Prisma.TransactionClient,
  schedule: CareSchedule,
  actorId: number,
) {
  const existing = new Set(
    (
      await tx.occurrence.findMany({
        where: { scheduleId: schedule.id },
        select: { day: true },
      })
    ).map((o) => o.day),
  );
  let count = 0;
  for (
    let time = Date.parse(schedule.startDay + "T12:00:00+05:00");
    time <= Date.parse(schedule.endDay + "T12:00:00+05:00");
    time += schedule.intervalDays * 86400000
  ) {
    const scheduledAt = new Date(time),
      day = dayKey(scheduledAt);
    if (existing.has(day)) continue;
    await tx.task.create({
      data: {
        treeId: schedule.treeId,
        zoneId: schedule.zoneId,
        assigneeId: schedule.assigneeId,
        workType: schedule.workType,
        scheduledAt,
        dueAt: new Date(day + "T23:59:59.999+05:00"),
        events: {
          create: {
            actorId,
            status: "ASSIGNED",
            message: "По графику №" + schedule.id,
          },
        },
        occurrence: { create: { scheduleId: schedule.id, day } },
      },
    });
    count++;
  }
  return count;
}
