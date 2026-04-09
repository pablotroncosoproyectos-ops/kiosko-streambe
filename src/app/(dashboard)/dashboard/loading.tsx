import type { ReactElement } from "react";

export default function DashboardReportsLoading(): ReactElement {
  return (
    <main className="flex min-h-0 w-full flex-1 flex-col [-ms-overflow-style:none] [scrollbar-width:none] print:hidden [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-6 px-4 py-4 text-zinc-900 md:px-6 md:py-6 dark:text-zinc-100">
        <header className="flex shrink-0 flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-4 w-72 max-w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-600/80" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-9 w-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-9 w-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-10 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-600" />
            <div className="flex flex-wrap gap-2">
              <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-10 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>
        </header>
        <div className="pt-8">
          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex min-h-[240px] animate-pulse flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="size-16 rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-6 w-40 rounded-md bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-full max-w-[200px] rounded bg-zinc-200/90 dark:bg-zinc-600/90" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
