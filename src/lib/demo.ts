export const pages = [
  { path: "/", label: "Обзор" },
  { path: "/map", label: "Карта города" },
  { path: "/reports", label: "Обращения" },
  { path: "/green-fund", label: "Зелёный фонд" },
  { path: "/tasks", label: "Задания" },
  { path: "/analytics", label: "Аналитика" },
  { path: "/ai-workspace", label: "AI Workspace" },
  { path: "/settings", label: "Настройки" },
] as const;
export const places = [
  { name: "Городской парк", lat: 44.848, lng: 65.472, kind: "green" },
  { name: "Сквер в центре", lat: 44.857, lng: 65.511, kind: "green" },
  { name: "Аллея на набережной", lat: 44.832, lng: 65.498, kind: "green" },
];
