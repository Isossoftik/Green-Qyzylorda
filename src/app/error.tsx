"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel form-card">
      <h2>Не удалось загрузить данные</h2>
      <p>Проверьте доступность локальной базы и повторите попытку.</p>
      <button className="primary" onClick={reset}>
        Повторить
      </button>
    </section>
  );
}
