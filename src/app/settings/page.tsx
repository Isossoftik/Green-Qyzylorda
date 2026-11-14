import { SectionHeading, Examples } from "@/components/section";

export default function Page() {
  return (
    <>
      <SectionHeading
        title="Настройки"
        description="Параметры демонстрационного рабочего пространства."
      />
      <Examples
        icon="settings"
        items={[
          "Язык интерфейса — русский",
          "Город мониторинга — Кызылорда",
          "Источник показателей — локальные тестовые данные",
        ]}
        note="DEMO ROLE в верхней панели свободно переключает участника локальной демонстрации. Авторизация пользователей не подключена."
      />
    </>
  );
}
