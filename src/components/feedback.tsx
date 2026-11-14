"use client";
import { useEffect, useRef, useState } from "react";
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("urban:toast", { detail: message }));
}
export function confirmAction(question: string) {
  return new Promise<boolean>((resolve) =>
    window.dispatchEvent(
      new CustomEvent("urban:confirm", { detail: { question, resolve } }),
    ),
  );
}
export function Feedback() {
  const [message, setMessage] = useState(""),
    [question, setQuestion] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const callback = useRef<((ok: boolean) => void) | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const notify = (e: Event) => {
      clearTimeout(timer);
      setMessage((e as CustomEvent<string>).detail);
      timer = setTimeout(() => setMessage(""), 3200);
    };
    const ask = (e: Event) => {
      const req = (
        e as CustomEvent<{ question: string; resolve: (ok: boolean) => void }>
      ).detail;
      callback.current?.(false);
      callback.current = req.resolve;
      setQuestion(req.question);
      dialog.current?.showModal();
    };
    window.addEventListener("urban:toast", notify);
    window.addEventListener("urban:confirm", ask);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("urban:toast", notify);
      window.removeEventListener("urban:confirm", ask);
      callback.current?.(false);
    };
  }, []);
  function finish(ok: boolean) {
    dialog.current?.close();
    callback.current?.(ok);
    callback.current = null;
  }
  return (
    <>
      <div className={message ? "toast shown" : "toast"} role="status">
        {message}
      </div>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          finish(false);
        }}
      >
        <h2 id="confirm-title">{question}</h2>
        <div>
          <button className="button" autoFocus onClick={() => finish(false)}>
            Отмена
          </button>
          <button className="primary" onClick={() => finish(true)}>
            Подтвердить
          </button>
        </div>
      </dialog>
    </>
  );
}
