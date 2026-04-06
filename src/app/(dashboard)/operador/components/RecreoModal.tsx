"use client";

import { Clock, X } from "lucide-react";
import type { Dispatch, ReactElement, SetStateAction } from "react";
import { formatRemainingTime } from "../formatters";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const MODAL_FIELD_CLASS =
  "rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100";

const MODAL_PRIMARY_ACTION_CLASS =
  "rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold uppercase tracking-tight text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const MODAL_SECONDARY_ACTION_CLASS =
  "rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export interface RecreoModalProps {
  recreoModalBackdropVisible: boolean;
  onClose: () => void;
  recreoBreakDisplay: {
    recreoSessionsStartedTodayCount: number;
    displayBreakIndex: number;
    maxBreaksPerDay: number;
  } | null;
  breakDurationMinutes: number;
  setBreakDurationMinutes: Dispatch<SetStateAction<number>>;
  isStartingRecreoSession: boolean;
  recreoStartErrorMessage: string;
  remainingTimeSeconds: number;
  isBreakActive: boolean;
  onStartBreak: () => void | Promise<void>;
  onCancelBreak: () => void;
}

export function RecreoModal(props: RecreoModalProps): ReactElement {
  const {
    recreoModalBackdropVisible,
    onClose,
    recreoBreakDisplay,
    breakDurationMinutes,
    setBreakDurationMinutes,
    isStartingRecreoSession,
    recreoStartErrorMessage,
    remainingTimeSeconds,
    isBreakActive,
    onStartBreak,
    onCancelBreak,
  } = props;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-0 backdrop-blur-md transition-opacity duration-300 ease-out md:p-6 ${
        recreoModalBackdropVisible
          ? "opacity-100"
          : "pointer-events-none opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recreo-modal-title"
    >
      <div
        className={`flex h-full w-full max-h-dvh flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-out dark:bg-zinc-900 md:h-auto md:max-h-[min(95vh,900px)] md:max-w-md md:rounded-3xl md:border md:border-white/20 ${
          recreoModalBackdropVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.95] opacity-0"
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 md:px-6 md:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock
                className="size-8 shrink-0 text-zinc-700 dark:text-zinc-200"
                aria-hidden
              />
              <h2
                id="recreo-modal-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Turno y recreo
              </h2>
            </div>
            {recreoBreakDisplay !== null ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Recreos hoy (colegio):{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {recreoBreakDisplay.recreoSessionsStartedTodayCount} /{" "}
                  {recreoBreakDisplay.maxBreaksPerDay}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [-ms-overflow-style:none] [scrollbar-width:none] md:px-6 md:py-5 [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col items-center gap-4">
            {recreoStartErrorMessage.length > 0 ? (
              <p
                className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                role="alert"
              >
                {recreoStartErrorMessage}
              </p>
            ) : null}

            {!isBreakActive && remainingTimeSeconds === 0 ? (
              <div className="flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-center">
                <label className="flex flex-col items-center gap-1 sm:items-start">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Duración (min)
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={breakDurationMinutes}
                    onChange={(event) =>
                      setBreakDurationMinutes(
                        Number.parseInt(event.target.value || "0", 10),
                      )
                    }
                    className={`w-full text-center sm:w-36 ${MODAL_FIELD_CLASS}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={isStartingRecreoSession}
                  onClick={() => void onStartBreak()}
                  className={`w-full shrink-0 sm:w-auto ${MODAL_PRIMARY_ACTION_CLASS}`}
                >
                  {isStartingRecreoSession ? "Registrando…" : "Iniciar recreo"}
                </button>
              </div>
            ) : (
              <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Termina en: {formatRemainingTime(remainingTimeSeconds)}
                </p>
                <button
                  type="button"
                  onClick={onCancelBreak}
                  className={`text-xs ${MODAL_SECONDARY_ACTION_CLASS}`}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
