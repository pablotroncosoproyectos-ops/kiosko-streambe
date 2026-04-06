import { formatArgentinaPesos } from "@/lib/currencyFormat";
import {
  formatArgentinaSaleDate,
  formatPaymentMethodLabel,
} from "./formatters";
import type { RecentSaleHistoryRecord } from "./types";

export interface GenerateSaleTicketPdfOptions {
  /** Etiqueta de la pestaña de historial (ej. Venta libre). */
  operationTypeLabel: string;
}

/**
 * Genera y descarga un PDF tipo ticket para una venta del historial (datos agregados).
 * Import dinámico de jspdf para no incluir el bundle Node en SSR de Next.js.
 */
export async function generateSaleTicketPDF(
  record: RecentSaleHistoryRecord,
  options: GenerateSaleTicketPdfOptions,
): Promise<void> {
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxTextWidth = pageWidth - margin * 2;
  let y = margin;

  const line = (text: string, fontSize = 10, bold = false): void => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxTextWidth);
    for (const chunk of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(chunk, margin, y);
      y += fontSize * 1.35;
    }
  };

  line("Ticket de venta (copia)", 16, true);
  y += 6;
  line(`Tipo de operación: ${options.operationTypeLabel}`, 11, true);
  y += 4;
  line(`Fecha: ${formatArgentinaSaleDate(record.createdAt)}`);
  line(`Vendedor: ${record.sellerFullName} (${record.sellerRole})`);
  line(`ID de venta: ${record.saleIdentifier}`);
  y += 8;
  line("Productos", 12, true);
  line(record.productNamesSummary || "—");
  y += 8;
  line(`Total: ${formatArgentinaPesos(record.totalAmount)}`, 12, true);
  line(`Medio de pago: ${formatPaymentMethodLabel(record.paymentMethod)}`);
  y += 16;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Documento informativo. No válido como factura fiscal.",
    margin,
    y,
  );
  doc.setTextColor(0, 0, 0);

  const shortId = record.saleIdentifier
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 12);
  doc.save(`ticket-venta-${shortId || "venta"}.pdf`);
}
