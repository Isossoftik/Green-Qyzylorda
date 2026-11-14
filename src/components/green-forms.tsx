"use client";
import { useCallback, useState, type ReactNode } from "react";
import { confirmAction, toast } from "./feedback";
import { useRouter } from "next/navigation";
import type { Tree } from "@prisma/client";
import {
  conditions,
  works,
  zoneConditions,
  zoneTypes,
  dayKey,
} from "@/lib/green";
import { LazyMap } from "./map-panel";
type Option = { id: number; name: string };
export function GreenForm({
  action,
  label,
  children,
  id,
  version,
  endpoint = "/api/green",
  pendingLabel = "Сохранение…",
}: {
  action: string;
  label: string;
  children?: ReactNode;
  id?: number;
  version?: number;
  endpoint?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="form-card panel"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (
          busy ||
          (["approve", "tree-delete"].includes(action) &&
            !(await confirmAction(label + "?")))
        )
          return;
        data.set("action", action);
        if (id) data.set("id", String(id));
        if (version !== undefined) data.set("version", String(version));
        setBusy(true);
        setError("");
        try {
          const r = await fetch(endpoint, { method: "POST", body: data });
          const result = await r.json();
          if (!r.ok) throw Error(result.error);
          toast("Изменения сохранены");
          router.push(result.href);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Не удалось сохранить");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      {error && (
        <p role="alert" className="error-msg">
          {error}
        </p>
      )}
      <button
        className={action === "tree-delete" ? "button" : "primary"}
        disabled={busy}
      >
        {busy ? pendingLabel : label}
      </button>
    </form>
  );
}
function Select({
  name,
  label,
  values,
  value,
}: {
  name: string;
  label: string;
  values: string[];
  value?: string;
}) {
  return (
    <label>
      {label}
      <select required name={name} defaultValue={value}>
        {values.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  );
}
function Location({ lat, lng }: { lat?: number; lng?: number }) {
  const [x, setX] = useState(lat?.toString() ?? ""),
    [y, setY] = useState(lng?.toString() ?? "");
  const pick = useCallback((a: number, b: number) => {
    setX(a.toFixed(6));
    setY(b.toFixed(6));
  }, []);
  return (
    <>
      <div className="coord-pair">
        <label>
          Широта
          <input
            required
            type="number"
            step="any"
            name="lat"
            value={x}
            onChange={(e) => setX(e.target.value)}
          />
        </label>
        <label>
          Долгота
          <input
            required
            type="number"
            step="any"
            name="lng"
            value={y}
            onChange={(e) => setY(e.target.value)}
          />
        </label>
      </div>
      <p className="hint">Введите координаты или укажите точку на карте.</p>
      <LazyMap onPick={pick} />
    </>
  );
}
export function TreeForm({ tree, zones }: { tree?: Tree; zones: Option[] }) {
  return (
    <GreenForm
      action={tree ? "tree-edit" : "tree-create"}
      id={tree?.id}
      version={tree?.version}
      label="Сохранить дерево"
    >
      <label>
        Порода
        <input
          required
          name="species"
          defaultValue={tree?.species}
          maxLength={100}
        />
      </label>
      <Select
        name="condition"
        label="Состояние"
        values={conditions}
        value={tree?.condition}
      />
      <label>
        Территория
        <select name="zoneId" defaultValue={tree?.zoneId ?? ""}>
          <option value="">Вне территории</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Адрес
        <input name="address" defaultValue={tree?.address} />
      </label>
      <Location lat={tree?.lat} lng={tree?.lng} />
      <div className="coord-pair">
        <label>
          Дата посадки
          <input
            type="date"
            name="planted"
            defaultValue={tree?.planted ? dayKey(tree.planted) : ""}
          />
        </label>
        <label>
          Последний осмотр
          <input
            type="date"
            name="inspected"
            defaultValue={tree?.inspected ? dayKey(tree.inspected) : ""}
          />
        </label>
      </div>
      <label>
        Фотография · до 5 МБ
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
        />
      </label>
      <label>
        Комментарий специалиста
        <textarea name="comment" defaultValue={tree?.comment} />
      </label>
    </GreenForm>
  );
}
export function ZoneForm({ users }: { users: Option[] }) {
  return (
    <GreenForm action="zone-create" label="Сохранить территорию">
      <label>
        Название
        <input required name="name" />
      </label>
      <Select name="kind" label="Тип территории" values={zoneTypes} />
      <label>
        Расположение
        <input required name="address" />
      </label>
      <Location />
      <label>
        Площадь, га
        <input name="area" type="number" step="any" min="0.000001" />
      </label>
      <Select name="condition" label="Состояние" values={zoneConditions} />
      <label>
        Ответственная бригада
        <select name="crewId" required>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
    </GreenForm>
  );
}
export function PlanForm({
  users,
  trees,
  zones,
  target,
  work,
  scheduleKey,
}: {
  users: Option[];
  trees: Option[];
  zones: Option[];
  target?: string;
  work?: string;
  scheduleKey?: string;
}) {
  return (
    <GreenForm
      action={scheduleKey ? "schedule" : "plan"}
      label={scheduleKey ? "Создать график и задания" : "Запланировать работу"}
    >
      {scheduleKey && (
        <>
          <input type="hidden" name="requestKey" value={scheduleKey} />
          <label>
            Интервал, дней
            <input
              name="intervalDays"
              type="number"
              min="1"
              max="365"
              defaultValue="7"
              required
            />
            <small>
              1 — ежедневно, 7 — еженедельно, другое число — свой интервал.
            </small>
          </label>
          <p className="hint">
            Интервал полива требует проверки специалистом. Один график включает
            до 90 работ в пределах года.
          </p>
        </>
      )}
      <Select
        name="workType"
        label="Вид работы"
        values={scheduleKey ? ["Полив", "Осмотр", "Уборка"] : works}
        value={work}
      />
      <label>
        Объект обслуживания
        <select required name="target" defaultValue={target ?? ""}>
          <option value="">Выберите объект</option>
          {(
            [
              ["tree", trees],
              ["zone", zones],
            ] as const
          ).map(([prefix, rows]) =>
            rows.map((r) => (
              <option key={prefix + ":" + r.id} value={prefix + ":" + r.id}>
                {prefix === "tree" ? "Дерево" : "Территория"} №{r.id} · {r.name}
              </option>
            )),
          )}
        </select>
      </label>
      <label>
        Исполнитель
        <select required name="assigneeId">
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>
      <div className="coord-pair">
        <label>
          Дата начала
          <input name="scheduled" required type="date" />
        </label>
        <label>
          {scheduleKey ? "Последняя дата графика" : "Выполнить до"}
          <input name="due" required type="date" />
        </label>
      </div>
    </GreenForm>
  );
}
