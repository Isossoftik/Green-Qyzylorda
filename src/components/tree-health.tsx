import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { conditions, type GreenPin } from "@/lib/green";
const palette = ["#6dca97", "#e5ba65", "#d78970", "#acac9b"];
export function TreeHealth({ pins }: { pins: GreenPin[] }) {
  const trees = pins.filter((p) => p.kind === "tree");
  let offset = 0;
  const groups = conditions.map((name, i) => {
    const count = trees.filter((p) => p.condition === name).length;
    const pct = trees.length ? (100 * count) / trees.length : 0;
    const start = offset;
    offset += pct;
    return { name, count, pct, start, color: palette[i] };
  });
  return (
    <section className="panel health">
      <div className="panel-head">
        <h2>Состояние деревьев</h2>
        <Link
          className="icon-link"
          href="/green-fund"
          aria-label="Открыть реестр деревьев"
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="health-chart">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
          />
          {groups
            .filter((g) => g.count)
            .map((g) => (
              <circle
                key={g.name}
                cx="60"
                cy="60"
                r="48"
                fill="none"
                strokeWidth="10"
                stroke={g.color}
                pathLength="100"
                strokeDasharray={
                  Math.max(0, g.pct - 1) + " " + (100 - g.pct + 1)
                }
                strokeDashoffset={-g.start}
                transform="rotate(-90 60 60)"
              />
            ))}
        </svg>
        <div>
          <b>{trees.length}</b>
          <small>в реестре</small>
        </div>
      </div>
      <div className="health-list">
        {groups.map((g) => (
          <Link
            href={"/green-fund?condition=" + encodeURIComponent(g.name)}
            key={g.name}
          >
            <i style={{ background: g.color }} />
            {g.name}
            <b>{g.count}</b>
            <small>{Math.round(g.pct)}%</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
