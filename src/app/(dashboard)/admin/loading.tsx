import type { ReactElement } from "react";

export default function AdminRouteLoading(): ReactElement {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="size-12 shrink-0 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            <div className="space-y-2">
              <div className="h-7 w-56 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/80" />
            </div>
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-120px)]">
          <div className="mx-auto w-full max-w-6xl">
            <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[280px] animate-pulse flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="size-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-6 w-32 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-3 w-48 rounded bg-zinc-200/90 dark:bg-zinc-600/90" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
