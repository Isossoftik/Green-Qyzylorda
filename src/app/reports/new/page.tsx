import { SectionHeading } from "@/components/section";
import { CreateReport } from "@/components/workflow-forms";
import { demoRole } from "@/lib/role";
import { db } from "@/lib/db";
export default async function Page() {
  return (
    <>
      <SectionHeading
        title="Новое обращение"
        description="Регистрация экологической проблемы на локальном демостенде."
      />
      {(await demoRole()) === "EXECUTOR" ? (
        <p>Для регистрации выберите роль жителя или оператора.</p>
      ) : (
        <CreateReport
          trees={await db.tree.findMany({
            select: { id: true, species: true },
          })}
        />
      )}
    </>
  );
}
