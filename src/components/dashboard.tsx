"use client";
import { useState } from "react";
import {
  FlaskConical,
  MessageSquareText,
  Inbox,
  ClipboardList,
  CheckCheck,
  Clock3,
  ChartColumn,
} from "lucide-react";
import { labels, categories, type Row } from "@/lib/workflow";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { TreeHealth } from "./tree-health";
import { MapPanel } from "./map-panel";
import { StatusChart } from "./status-chart";
import { ReportTable } from "./report-table";
export function DemoBadge() {
  return (
    <span className="demo-badge">
      <FlaskConical size={12} />
      Демо-режим
    </span>
  );
}
import type { GreenPin } from "@/lib/green";
export function Dashboard({
  pins,
  rows,
  analytics = false,
  activeWork,
  canCreate = false,
  now,
}: {
  rows: Row[];
  analytics?: boolean;
  activeWork?: React.ReactNode;
  canCreate?: boolean;
  pins?: GreenPin[];
  now: number;
}) {
  const [days, setDays] = useState(0);
  const data = rows.filter(
    (r) => !days || +r.createdAt >= now - days * 86400000,
  );
  const count = (status: string) =>
    data.filter((r) => r.status === status).length;
  const stats = [
    {
      title: "Всего обращений",
      value: data.length,
      icon: MessageSquareText,
      color: "blue",
    },
    { title: "Новые", value: count("NEW"), icon: Inbox, color: "amber" },
    {
      title: "В работе",
      value: count("IN_PROGRESS"),
      icon: ClipboardList,
      color: "purple",
    },
    {
      title: "Завершённые",
      value: count("CLOSED"),
      icon: CheckCheck,
      color: "green",
    },
    {
      title: "Просроченные задания",
      value: data.filter(
        (r) =>
          r.task &&
          ["ASSIGNED", "IN_PROGRESS"].includes(r.task.status) &&
          +r.task.dueAt < now,
      ).length,
      icon: Clock3,
      color: "amber",
    },
  ];
  const statuses = Object.entries(labels)
    .map(([key, name]) => ({ name, value: count(key) }))
    .filter((d) => d.value);
  return (
    <>
      <div className={analytics ? "page-intro" : "monitor-hero"}>
        <div>
          {!analytics && (
            <div className="hero-kicker">
              <i />
              ЭКОЛОГИЧЕСКИЙ МОНИТОРИНГ
            </div>
          )}
          <div className="title-row">
            <h1>{analytics ? "Аналитика" : "Обзор города"}</h1>
            {analytics && <DemoBadge />}
          </div>
          <p>
            {analytics
              ? "Распределение обращений и состояние зелёного фонда."
              : "Кызылорда и её зелёные территории"}
          </p>
          {!analytics && (
            <div className="hero-actions">
              <Link href="/map">
                Открыть карту <ArrowUpRight size={14} />
              </Link>
              {canCreate && (
                <Link href="/reports/new">
                  <Plus size={14} />
                  Обращение
                </Link>
              )}
            </div>
          )}
        </div>
        {!analytics && (
          <div className="hero-art" aria-hidden="true">
            <img src="/urban-grove.svg" alt="" />
          </div>
        )}
        {analytics && (
          <select
            aria-label="Период регистрации обращений"
            className="button"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={0}>За всё время</option>
            <option value={7}>За неделю</option>
            <option value={30}>За месяц</option>
          </select>
        )}
      </div>
      {!analytics && (
        <div className="strip-head">
          <h2>Сводка обращений</h2>
          <select
            aria-label="Период регистрации обращений"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={0}>За всё время</option>
            <option value={7}>За неделю</option>
            <option value={30}>За месяц</option>
          </select>
        </div>
      )}
      <div className="metrics workflow-metrics">
        {stats.map(({ title, value, icon: Icon, color }) => (
          <section className={"metric " + color} key={title}>
            <div className="metric-top">
              <span className="metric-icon">
                <Icon size={17} />
              </span>
              {title}
            </div>
            <div className="metric-middle">
              <strong>{value}</strong>
            </div>
          </section>
        ))}
      </div>
      <div className="overview-grid">
        {analytics ? (
          <Categories rows={data} />
        ) : (
          <MapPanel pins={pins} rows={data} />
        )}
        {analytics ? (
          <StatusChart data={statuses} />
        ) : (
          <TreeHealth pins={pins ?? []} />
        )}
      </div>
      {!analytics && (
        <>
          <div className="overview-bottom">
            <ReportTable rows={data} preview />
            {activeWork}
          </div>
          <details className="summary-extra">
            <summary>Распределение обращений</summary>
            <div className="overview-grid">
              <Categories rows={data} />
              <StatusChart data={statuses} />
            </div>
          </details>
        </>
      )}
    </>
  );
}
function Categories({ rows }: { rows: Row[] }) {
  return (
    <section className="panel categories">
      <div className="panel-head">
        <h2>
          <ChartColumn />
          По категориям
        </h2>
      </div>
      {categories.map((c) => {
        const n = rows.filter((r) => r.category === c).length;
        return (
          <div className="bar-row" key={c}>
            <span>{c}</span>
            <b>{n}</b>
            <progress value={n} max={rows.length || 1} />
          </div>
        );
      })}
    </section>
  );
}
