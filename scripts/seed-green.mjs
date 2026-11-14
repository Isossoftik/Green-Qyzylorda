export async function seedGreen(db) {
  await db.$transaction(async (tx) => {
    const zones = [];
    for (const [i, name, kind, lat, lng] of [
      [1, "Сквер у набережной", "Сквер", 44.843, 65.479],
      [2, "Парк в микрорайоне Арай", "Парк", 44.836, 65.497],
      [3, "Центральная аллея", "Аллея", 44.85, 65.51],
    ]) {
      zones.push(
        await tx.zone.upsert({
          where: { seedKey: "zone-" + i },
          update: {},
          create: {
            seedKey: "zone-" + i,
            name: "DEMO · " + name,
            kind,
            lat,
            lng,
            address: "Кызылорда · учебный участок " + i,
            area: [1.6, 4.2, 0.7][i - 1],
            condition: "Хорошее",
            crewId: 3,
          },
        }),
      );
    }
    const trees = [];
    for (const [i, species] of [
      "Карагач",
      "Тополь",
      "Ива белая",
      "Ясень",
      "Клён",
      "Берёза",
      "Вяз",
      "Ива",
    ].entries()) {
      const z = zones[i % 3];
      trees.push(
        await tx.tree.upsert({
          where: { seedKey: "tree-" + i },
          update: {},
          create: {
            seedKey: "tree-" + i,
            species,
            lat: z.lat + 0.001 * (i + 1),
            lng: z.lng + 0.001,
            zoneId: z.id,
            address: z.address,
            condition: ["Здоровое", "Требует ухода", "Повреждено", "Засохло"][
              i % 4
            ],
            inspected: new Date(Date.now() - (i * 25 + 1) * 86400000),
            comment: "DEMO · Учебная инвентаризация.",
          },
        }),
      );
    }
    for (const [i, workType] of ["Полив", "Осмотр", "Уборка"].entries()) {
      const time = new Date(Date.now() + (i - 1) * 86400000);
      await tx.task.upsert({
        where: { seedKey: "care-" + i },
        update: {},
        create: {
          seedKey: "care-" + i,
          workType,
          assigneeId: 3,
          ...(i === 2 ? { zoneId: zones[0].id } : { treeId: trees[i].id }),
          scheduledAt: time,
          dueAt: new Date(+time + 3600000),
          events: {
            create: {
              actorId: 2,
              status: "ASSIGNED",
              message: "DEMO · плановая работа",
            },
          },
        },
      });
    }
  });
}
