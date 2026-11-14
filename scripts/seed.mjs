import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { seedGreen } from "./seed-green.mjs";
const db = new PrismaClient(
  process.env.GREEN_TEST === "1"
    ? { datasourceUrl: "file:" + path.resolve(".tools/test/demo.db") }
    : undefined,
);
const users = [
  [1, "Демо-житель", "RESIDENT"],
  [2, "Алия Омарова", "OPERATOR"],
  [3, "Городская бригада", "EXECUTOR"],
];
const rows = [
  [
    "Требуется полив молодых деревьев",
    "Отсутствие полива",
    "мкр. Арай",
    44.831,
    65.476,
    "NEW",
  ],
  [
    "Мусор у входа в сквер",
    "Мусор на территории",
    "ул. Айтеке би",
    44.846,
    65.492,
    "IN_REVIEW",
  ],
  [
    "Надломлена ветвь у тротуара",
    "Повреждённое дерево",
    "мкр. Акмешит",
    44.852,
    65.525,
    "ASSIGNED",
  ],
  [
    "Засохший карагач во дворе",
    "Засохшее дерево",
    "ул. Абая",
    44.84,
    65.489,
    "IN_PROGRESS",
  ],
  [
    "Вытоптан газон у аллеи",
    "Повреждение зелёной зоны",
    "набережная Сырдарьи",
    44.838,
    65.474,
    "CLOSED",
  ],
  [
    "Осмотр арыка после уборки",
    "Другое",
    "мкр. Арай",
    44.844,
    65.508,
    "RESOLVED",
  ],
  [
    "Засорился канал полива",
    "Отсутствие полива",
    "ул. Жибек жолы",
    44.848,
    65.504,
    "NEW",
  ],
];
try {
  for (const [id, name, role] of users)
    await db.user.upsert({
      where: { id },
      create: { id, name, role },
      update: {},
    });
  for (const [
    index,
    [title, category, address, lat, lng, status],
  ] of rows.entries()) {
    const seedKey = "city-" + index,
      createdAt = new Date(Date.now() - (index === 6 ? 10 : index) * 86400000);
    const sequence = [
      "NEW",
      "IN_REVIEW",
      "ASSIGNED",
      "IN_PROGRESS",
      "RESOLVED",
      "CLOSED",
    ].slice(
      0,
      [
        "NEW",
        "IN_REVIEW",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
      ].indexOf(status) + 1,
    );
    const messages = [
      "Зарегистрировано жителем",
      "Принято на рассмотрение",
      "Назначена городская бригада",
      "Работа начата",
      "Результат передан оператору",
      "Оператор подтвердил выполнение",
    ];
    await db.report.upsert({
      where: { seedKey },
      update: {},
      create: {
        seedKey,
        title,
        category,
        address,
        lat,
        lng,
        status,
        description: title + ". Просим проверить участок и принять меры.",
        contact: "resident@example.test",
        authorId: 1,
        createdAt,
        ...(sequence.length >= 3
          ? {
              task: {
                create: {
                  assigneeId: 3,
                  status,
                  dueAt: new Date(
                    Date.now() + (index === 3 ? -1 : 2) * 86400000,
                  ),
                  comment:
                    sequence.length >= 5
                      ? "Участок осмотрен, работы выполнены."
                      : null,
                },
              },
            }
          : {}),
        history: {
          create: sequence.map((s, i) => ({
            actorId: [1, 2, 2, 3, 3, 2][i],
            fromStatus: sequence[i - 1],
            toStatus: s,
            message: messages[i],
            createdAt: new Date(+createdAt + i * 60000),
          })),
        },
      },
    });
  }
  await seedGreen(db);
} finally {
  await db.$disconnect();
}
