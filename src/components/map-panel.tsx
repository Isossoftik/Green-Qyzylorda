"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState, useMemo } from "react";
import { Map, ArrowUpRight } from "lucide-react";
import type { Row } from "@/lib/workflow";
import { Filters } from "./report-filters";
export const LazyMap = dynamic(() => import("./city-map"), {
  ssr: false,
  loading: () => <div className="city-map loading-map">Загрузка карты…</div>,
});
import { conditions, type GreenPin } from "@/lib/green";
const empty: GreenPin[] = [];
const layers = {
  report: "Обращения",
  tree: "Деревья",
  green: "Территории",
  task: "Задания",
};
export function MapPanel({
  full = false,
  rows,
  pins = empty,
  focus,
}: {
  full?: boolean;
  focus?: string;
  rows: Row[];
  pins?: GreenPin[];
}) {
  const [category, setCategory] = useState(""),
    [status, setStatus] = useState("");
  const [visible, setVisible] = useState(Object.keys(layers)),
    [condition, setCondition] = useState("");
  const shown = useMemo(
    () =>
      pins.filter(
        (p) =>
          visible.includes(p.kind) &&
          (p.kind !== "tree" || !condition || p.condition === condition),
      ),
    [pins, visible, condition],
  );
  const [selected, setSelected] = useState<{
    name: string;
    href: string;
    detail: string;
    lat: number;
    lng: number;
  } | null>(null);
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          visible.includes("report") &&
          (!category || category === r.category) &&
          (!status || status === r.status),
      ),
    [category, status, rows, visible],
  );
  return (
    <section className={"panel map-panel " + (full ? "gis-panel" : "")}>
      <div className="panel-head">
        <h2>
          <Map />
          Карта города
        </h2>
        {!full && (
          <Link href="/map" className="icon-link" title="Открыть карту">
            Открыть <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
      <div className="gis-layout">
        {full && (
          <aside className="gis-controls">
            <h3>Фильтры карты</h3>
            <Filters
              {...{
                category,
                status,
                onCategory: setCategory,
                onStatus: setStatus,
              }}
            />
            <h3>Слои</h3>
            <div className="layer-options">
              {Object.entries(layers).map(([k, v]) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={visible.includes(k)}
                    onChange={() =>
                      setVisible((prev) =>
                        prev.includes(k)
                          ? prev.filter((s) => s !== k)
                          : [...prev, k],
                      )
                    }
                  />
                  {v}
                </label>
              ))}
              <label>
                Состояние дерева
                <select
                  className="button"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="">Все</option>
                  {conditions.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          </aside>
        )}
        <div className="map-frame">
          <LazyMap
            full={full}
            rows={filtered}
            pins={shown}
            focus={focus}
            onSelect={full ? setSelected : undefined}
          />
          {!full && <span className="map-location">КЫЗЫЛОРДА · KZ</span>}
        </div>
      </div>
      {full && (
        <div className="map-selection">
          {selected &&
          (shown.some((p) => p.href === selected.href) ||
            filtered.some((r) => "/reports/" + r.id === selected.href)) ? (
            <>
              <b>{selected.name}</b>
              <span>
                {selected.detail} · {selected.lat.toFixed(4)}°,{" "}
                {selected.lng.toFixed(4)}°
              </span>
              <Link className="text-link" href={selected.href}>
                Карточка объекта ↗
              </Link>
            </>
          ) : (
            <span>Выберите маркер, чтобы открыть сведения об объекте.</span>
          )}
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="dot green" />
          Деревья
        </span>
        <span>
          <i className="dot amber" />
          Обращения · {filtered.length}
        </span>
        <span>
          <i className="dot purple" />
          Территории
        </span>
        <span>
          <i className="dot blue" />
          Задания
        </span>
        {!filtered.length && "По выбранным условиям обращений нет"}
      </div>
    </section>
  );
}
