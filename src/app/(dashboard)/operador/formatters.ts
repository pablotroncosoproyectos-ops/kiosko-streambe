import type { RecentSaleHistoryRecord } from "./types";

export function formatRemainingTime(remainingTimeSeconds: number): string {
  const minutes = Math.floor(remainingTimeSeconds / 60);
  const seconds = remainingTimeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatPaymentMethodLabel(
  paymentMethod: RecentSaleHistoryRecord["paymentMethod"],
): string {
  switch (paymentMethod) {
    case "CASH":
      return "Efectivo";
    case "DEBIT":
      return "Débito";
    case "TRANSFER":
      return "Transferencia";
    case "QR":
      return "QR";
    default:
      return paymentMethod;
  }
}

export function formatArgentinaSaleDate(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function isMissingOpenSessionSaleMessage(rawMessage: string): boolean {
  const normalized = rawMessage.toLowerCase();
  return (
    normalized.includes("no se encontró una sesión abierta") ||
    normalized.includes("debe abrir una sesión")
  );
}
