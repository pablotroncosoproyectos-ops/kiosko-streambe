import { Banknote, CreditCard, Landmark, QrCode } from "lucide-react";

export const MISSING_OPEN_SESSION_UI_MESSAGE =
  "Debe abrir una sesión (Caja/Recreo) antes de realizar una venta.";

export const PAYMENT_METHOD_OPTIONS = [
  { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
  { value: "DEBITO", label: "Débito", icon: CreditCard },
  { value: "TRANSFERENCIA", label: "Transfer.", icon: Landmark },
  { value: "QR", label: "QR", icon: QrCode },
] as const;

/** Mismo estilo glass que el modal de producto en Admin */
export const OPERATOR_GLASS_MODAL_BACKDROP =
  "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md transition-opacity duration-300 ease-out dark:bg-zinc-950/55 md:p-6";

export const OPERATOR_GLASS_MODAL_PANEL =
  "flex max-h-[min(100dvh,100vh)] w-full max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:max-h-[min(92vh,900px)] md:max-w-7xl";

export const FEEDBACK_DISPLAY_TIME_MILLISECONDS = 900;
export const DEFAULT_BREAK_DURATION_MINUTES = 15;
export const BREAK_END_TIME_STORAGE_KEY = "breakEndTimeTimestamp";
export const CART_PAGE_SIZE = 10;
export const HISTORY_PAGE_SIZE = 20;
export const MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH = 2000;
