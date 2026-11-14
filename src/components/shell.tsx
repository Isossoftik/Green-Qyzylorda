"use client";
import { Feedback } from "./feedback";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Leaf,
  LayoutDashboard,
  Map,
  MessageSquareText,
  Trees,
  ClipboardList,
  ChartNoAxesCombined,
  ScanLine,
  Settings2,
  PanelLeftClose,
  Menu,
  X,
  ChevronRight,
  CalendarDays,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { roles } from "@/lib/workflow";
import type { Role } from "@prisma/client";
import { pages } from "@/lib/demo";
const icons = [
  LayoutDashboard,
  Map,
  MessageSquareText,
  Trees,
  ClipboardList,
  ChartNoAxesCombined,
  ScanLine,
  Settings2,
];
export function Shell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const current = pages.find(
    (p) => p.path === path || (p.path !== "/" && path.startsWith(p.path + "/")),
  );
  const title = current?.label ?? "Страница";
  return (
    <div className={compact ? "shell compact" : "shell"}>
      <Feedback />
      {open && (
        <button
          className="scrim"
          onClick={() => setOpen(false)}
          aria-label="Закрыть меню"
        />
      )}
      <aside className={open ? "sidebar opened" : "sidebar"}>
        <Link
          className="brand"
          href="/"
          onClick={() => setOpen(false)}
          aria-label="Green Qyzylorda AI"
        >
          <span className="brand-symbol">
            <img src="/urban-mark.svg" width="34" height="34" alt="" />
          </span>
          <span className="brand-name">
            Green Qyzylorda <b>AI</b>
          </span>
        </Link>
        <button
          className="mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
        >
          <X />
        </button>
        <nav aria-label="Основная навигация">
          <div className="nav-heading">РАБОЧЕЕ ПРОСТРАНСТВО</div>
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <div key={p.path}>
                {p.path === "/settings" && (
                  <div className="nav-heading second">СИСТЕМА</div>
                )}
                <Link
                  title={p.label}
                  href={p.path}
                  onClick={() => setOpen(false)}
                  aria-current={current?.path === p.path ? "page" : undefined}
                  className={
                    "nav-link " + (current?.path === p.path ? "selected" : "")
                  }
                >
                  <Icon size={18} />
                  <span>{p.label}</span>
                  {current?.path === p.path && <i />}
                </Link>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-locator">
          <MapPin size={15} />
          <strong>Кызылорда</strong>
          <small>44.84° N · 65.50° E</small>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">{roles[role][0]}</span>
          <div>
            <strong>{roles[role]}</strong>
            <small>Локальный демостенд</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <button
            className="menu-toggle"
            aria-label="Переключить меню"
            onClick={() =>
              window.matchMedia("(max-width: 800px)").matches
                ? setOpen(!open)
                : setCompact(!compact)
            }
          >
            <PanelLeftClose className="desktop-icon" size={17} />
            <Menu className="mobile-icon" size={20} />
          </button>
          <div className="breadcrumb">
            Кызылорда <ChevronRight size={12} /> <strong>{title}</strong>
          </div>
          <div className="header-right">
            <label
              className="role-switch"
              title="Свободное переключение роли на локальном демостенде"
            >
              DEMO ROLE{" "}
              <select
                aria-label="Демонстрационная роль"
                value={role}
                onChange={(e) => {
                  document.cookie =
                    "demo-role=" + e.target.value + "; Path=/; SameSite=Strict";
                  window.location.reload();
                }}
              >
                {Object.entries(roles).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <span>
              <MapPin size={14} /> Кызылорда
            </span>
            <i />
            <span>
              <CalendarDays size={14} />{" "}
              {new Date().toLocaleDateString("ru-RU", {
                timeZone: "Asia/Qyzylorda",
              })}
            </span>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <FlaskConical size={13} /> Демонстрационные данные проекта Green
          Qyzylorda AI
        </footer>
      </div>
    </div>
  );
}
