"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from "react";

function formatArgentinaDateTimeMedium(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

/**
 * Reloj Buenos Aires aislado: el intervalo de 1 s solo re-renderiza este subárbol,
 * no todo el DashboardShell.
 */
export function CurrentDateTime(): ReactElement {
  const hasClientMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [argentinaDateTimeDisplay, setArgentinaDateTimeDisplay] =
    useState<string>("");

  useEffect(() => {
    const tick = (): void => {
      setArgentinaDateTimeDisplay(formatArgentinaDateTimeMedium(new Date()));
    };
    const timeoutId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="ml-auto min-w-0 text-right md:ml-0 md:text-left">
      <p
        className="truncate text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
        suppressHydrationWarning
      >
        {hasClientMounted ? argentinaDateTimeDisplay : "—"}
      </p>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Argentina
      </p>
    </div>
  );
}
