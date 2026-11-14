"use client";
import { useState, useCallback, type FormEvent } from "react";
import { confirmAction, toast } from "./feedback";
import { useRouter } from "next/navigation";
import type { Role, Status } from "@prisma/client";
import { categories, allowed, commands, type Command } from "@/lib/workflow";
import { LazyMap } from "./map-panel";
function Photo({ required = false }: { required?: boolean }) {
  return (
    <label>
      {required ? "Фото результата" : "Фотография (по желанию)"}
      <input
        name="photo"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        required={required}
      />
      <small>JPEG, PNG или WebP, до 5 МБ</small>
    </label>
  );
}
function useSubmit() {
  const router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function send(
    e: FormEvent<HTMLFormElement>,
    action: string,
    confirmText?: string,
  ) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (pending || (confirmText && !(await confirmAction(confirmText + "?"))))
      return;
    data.set("action", action);
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);
      toast(
        action === "create"
          ? "Обращение зарегистрировано"
          : "Изменения сохранены",
      );
      if (action === "create") {
        router.push(
          result.candidates?.length
            ? "/ai-workspace?report=" + result.id
            : "/reports/" + result.id + "?created=1",
        );
      } else {
        setNotice("Изменения сохранены");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка соединения");
    } finally {
      setPending(false);
    }
  }
  const feedback = (
    <>
      {error && (
        <p role="alert" className="error-msg">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="success-msg">
          {notice}
        </p>
      )}
    </>
  );
  return { send, pending, feedback };
}
export function CreateReport({
  trees,
}: {
  trees: { id: number; species: string }[];
}) {
  const { send, pending, feedback } = useSubmit();
  const [point, setPoint] = useState<[number, number] | null>(null);
  const pick = useCallback(
    (lat: number, lng: number) => setPoint([lat, lng]),
    [],
  );
  return (
    <form className="panel form-card" onSubmit={(e) => send(e, "create")}>
      <h2>Данные обращения</h2>
      <label>
        Связанное дерево
        <select name="treeId">
          <option value="">Не указано</option>
          {trees.map((t) => (
            <option key={t.id} value={t.id}>
              {t.species} №{t.id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Категория
        <select name="category" required defaultValue="">
          <option value="" disabled>
            Выберите категорию
          </option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Заголовок
        <input name="title" required minLength={3} maxLength={140} />
      </label>
      <label>
        Описание
        <textarea
          name="description"
          required
          minLength={10}
          maxLength={2500}
          rows={3}
        />
      </label>
      <label>
        Адрес
        <input name="address" required minLength={3} maxLength={240} />
      </label>
      <div>
        <strong>Место на карте</strong>
        <p className="hint">
          Нажмите на карту, чтобы отметить место обращения.
        </p>
        <LazyMap onPick={pick} />
        <small>
          {point
            ? point.map((p) => p.toFixed(5)).join(", ")
            : "Точка ещё не выбрана"}
        </small>
      </div>
      <input type="hidden" name="lat" value={point?.[0] ?? ""} />
      <input type="hidden" name="lng" value={point?.[1] ?? ""} />
      <Photo />
      <label>
        Телефон или e-mail заявителя
        <input
          name="contact"
          required
          maxLength={160}
          placeholder="resident@example.test"
        />
        <small>
          Для демонстрации используйте вымышленные контактные данные.
        </small>
      </label>
      {feedback}
      <button className="primary" disabled={pending}>
        {pending ? "Сохранение…" : "Зарегистрировать обращение"}
      </button>
    </form>
  );
}
export function Actions({
  role,
  status,
  id,
  version,
  clarification,
  users,
  owned,
}: {
  role: Role;
  status: Status;
  id: number;
  version: number;
  clarification: string | null;
  users: { id: number; name: string }[];
  owned: boolean;
}) {
  const { send, pending, feedback } = useSubmit();
  const options = (Object.keys(commands) as Command[]).filter(
    (a) => allowed(a, role, status, clarification) && owned,
  );
  const [selected, setSelected] = useState<Command | null>(null);
  const action = selected && options.includes(selected) ? selected : options[0];
  return (
    <section className="panel form-card">
      <h2>Действия по обращению</h2>
      {feedback}
      {action ? (
        <form
          key={action + version}
          className="fields"
          onSubmit={(e) => send(e, action, commands[action].label)}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <label>
            Действие
            <select
              value={action}
              onChange={(e) => setSelected(e.target.value as Command)}
            >
              {options.map((a) => (
                <option key={a} value={a}>
                  {commands[a].label}
                </option>
              ))}
            </select>
          </label>
          {action === "assign" && (
            <>
              <label>
                Исполнитель
                <select name="assigneeId" required>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Выполнить до
                <input type="date" name="due" required />
              </label>
            </>
          )}
          {["clarify", "reject", "finish", "reply", "redo"].includes(
            action,
          ) && (
            <label>
              {action === "finish" ? "Комментарий исполнителя" : "Комментарий"}
              <textarea
                name="comment"
                required
                minLength={3}
                maxLength={2000}
              />
            </label>
          )}
          {action === "finish" && <Photo required />}
          <button className="primary" disabled={pending}>
            {pending ? "Сохранение…" : commands[action].label}
          </button>
        </form>
      ) : (
        <p className="hint">Для вашей роли в этом статусе действий нет.</p>
      )}
    </section>
  );
}
