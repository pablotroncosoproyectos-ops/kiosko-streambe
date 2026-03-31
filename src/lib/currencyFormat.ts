/**
 * Formato monetario ARS (símbolo $) para la UI, zona horaria independiente del valor.
 */
export function formatArgentinaPesos(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "$ 0,00";
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
