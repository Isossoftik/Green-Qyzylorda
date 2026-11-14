import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { demoRole } from "@/lib/role";
import { PlanForm, TreeForm, ZoneForm } from "@/components/green-forms";
import { FundHeading } from "@/components/fund-shell";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ target?: string; work?: string }>;
}) {
  const { kind } = await params;
  if (!["tree", "zone", "work"].includes(kind)) notFound();
  const role = await demoRole();
  const zones = await db.zone.findMany({ select: { id: true, name: true } }),
    users = await db.user.findMany({
      where: { role: "EXECUTOR" },
      select: { id: true, name: true },
    });
  return (
    <>
      <FundHeading
        active={
          kind === "tree" ? "trees" : kind === "zone" ? "zones" : "calendar"
        }
        title={
          kind === "tree"
            ? "Новое дерево"
            : kind === "zone"
              ? "Новая территория"
              : "Планирование работы"
        }
        desc="Учёт зелёного фонда · локальный демостенд"
      />
      {role !== "OPERATOR" ? (
        <p className="empty">Для внесения данных выберите роль оператора.</p>
      ) : kind === "tree" ? (
        <TreeForm zones={zones} />
      ) : kind === "zone" ? (
        <ZoneForm users={users} />
      ) : (
        <PlanForm
          {...await searchParams}
          zones={zones}
          users={users}
          trees={(await db.tree.findMany()).map((t) => ({
            id: t.id,
            name: t.species,
          }))}
        />
      )}
    </>
  );
}
