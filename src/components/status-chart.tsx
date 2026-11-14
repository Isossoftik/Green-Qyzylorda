"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartPie } from "lucide-react";
import { labels } from "@/lib/workflow";
const palette = [
  "#e5b964",
  "#84b7bb",
  "#b7a6c9",
  "#75a6b7",
  "#95c8ab",
  "#56b586",
  "#ed8989",
];
const colors = new Map(
  Object.values(labels).map((label, i) => [label, palette[i]]),
);
export function StatusChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <h2>
          <ChartPie />
          Статусы обращений
        </h2>
      </div>
      <div className="donut" role="img" aria-label={total + " обращений"}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 180, height: 165 }}
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="73%"
              outerRadius="97%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              paddingAngle={3}
              cornerRadius={3}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={colors.get(d.name)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#192923",
                border: "1px solid #34483E",
                borderRadius: 8,
              }}
              itemStyle={{ color: "#fff" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-text">
          <b>{total}</b>
          <small>обращений</small>
        </div>
      </div>
      <div className="chart-legend">
        {!total && <p className="empty">За выбранный период обращений нет.</p>}
        {data.map((d) => (
          <div key={d.name}>
            <span>
              <i className="dot" style={{ background: colors.get(d.name) }} />
              {d.name}
            </span>
            <b>{d.value}</b>
            <small>{Math.round((d.value / total) * 100)}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}
