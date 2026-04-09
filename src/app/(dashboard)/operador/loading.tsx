import type { ReactElement } from "react";

/**
 * Suspense de navegación: solo sustituye el contenido de la página; el sidebar
 * permanece en el layout padre `(dashboard)/layout.tsx`.
 */
export default function OperadorRouteLoading(): ReactElement {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-950 [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
            <div className="space-y-2 pt-0.5">
              <div className="h-6 w-44 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-56 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/80" />
            </div>
          </div>
          <div className="h-10 w-28 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="flex flex-1 flex-col items-center py-8">
          <div className="grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:max-w-5xl">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-[240px] animate-pulse flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="size-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-6 w-36 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-48 rounded bg-zinc-200/90 dark:bg-zinc-600/90" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
