"use client";
import Link from "next/link";
import {
  Search,
  ListFilter,
  ArrowRight,
  MessageSquareText,
} from "lucide-react";
import { useState } from "react";
import { labels, date, type Row } from "@/lib/workflow";
import { Filters } from "./report-filters";
export function ReportTable({
  rows,
  preview = false,
}: {
  rows: Row[];
  preview?: boolean;
}) {
  const [category, onCategory] = useState(""),
    [status, onStatus] = useState("");
  const [query, setQuery] = useState("");
  const filtered = rows.filter(
    (r) =>
      [r.title, r.address, String(r.id)].some((v) =>
        v
          .toLocaleLowerCase("ru")
          .includes(query.trim().toLocaleLowerCase("ru")),
      ) &&
      (!category || r.category === category) &&
      (!status || r.status === status),
  );
  return (
    <section className="panel table-panel">
      <div className="panel-head">
        <h2>
          <ListFilter />
          {preview ? "Последние обращения" : "Реестр обращений"}
        </h2>
        {preview && (
          <Link href="/reports" className="text-link">
            Все обращения <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {!preview && (
        <div className="ticket-tools">
          <label className="quick-search">
            <Search size={16} />
            <input
              aria-label="Поиск обращений"
              placeholder="Название, адрес или номер"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Filters {...{ category, status, onCategory, onStatus }} />
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {["Обращение", "Категория", "Статус", "Дата"].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(preview ? filtered.slice(0, 4) : filtered).map((r) => (
              <tr key={r.id}>
                <td>
                  <Link className="report-name" href={"/reports/" + r.id}>
                    <i className="row-icon blue">
                      <MessageSquareText size={16} />
                    </i>
                    <div>
                      <strong>{r.title}</strong>
                      <small>
                        №{r.id} · {r.address}
                      </small>
                    </div>
                  </Link>
                </td>
                <td>{r.category}</td>
                <td>
                  <span
                    data-state={r.status}
                    className={
                      "status " +
                      (r.status === "CLOSED"
                        ? "green"
                        : r.status === "NEW"
                          ? "amber"
                          : "blue")
                    }
                  >
                    <i />
                    {labels[r.status]}
                  </span>
                </td>
                <td>{date(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="empty">Обращений по выбранным условиям нет.</p>
      )}
    </section>
  );
}
