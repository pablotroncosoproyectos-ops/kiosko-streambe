import type { ReactElement } from "react";

const SKELETON_CARD_CLASS =
  "flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900";

/**
 * Placeholder visual mientras se resuelve el estado de sesión de caja en Punto de venta.
 */
export function OperadorSessionGridSkeleton(): ReactElement {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0 gap-4 py-4 md:py-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Cargando sesión de caja"
    >
      <div className="flex w-full shrink-0 items-start justify-between gap-3 px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          <div className="min-w-0 space-y-2 pt-0.5">
            <div className="h-6 w-48 max-w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/80" />
          </div>
        </div>
        <div className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
      </div>

      <div className="flex flex-1 flex-col items-center overflow-hidden px-4 md:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
          <div className="grid w-full grid-cols-1 justify-center gap-6 md:grid-cols-2 md:gap-8 lg:max-w-5xl lg:mx-auto">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`${SKELETON_CARD_CLASS} animate-pulse`}
                aria-hidden
              >
                <div className="size-16 shrink-0 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-6 w-40 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full max-w-[200px] rounded bg-zinc-200/90 dark:bg-zinc-600/90" />
                <div className="h-3 w-full max-w-[160px] rounded bg-zinc-200/70 dark:bg-zinc-600/70" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
