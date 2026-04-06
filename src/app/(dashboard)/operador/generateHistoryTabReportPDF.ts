import { formatArgentinaPesos } from "@/lib/currencyFormat";
import {
  formatArgentinaSaleDate,
  formatPaymentMethodLabel,
} from "./formatters";
import type { RecentSaleHistoryRecord } from "./types";

export interface GenerateHistoryTabReportPdfOptions {
  /** Nombre de la pestaña para el título (ej. Venta libre). */
  tabDisplayName: string;
}

function truncateId(id: string, maxLength: number): string {
  if (id.length <= maxLength) {
    return id;
  }
  return `${id.slice(0, maxLength - 3)}...`;
}

/**
 * PDF de reporte con todas las ventas de la pestaña activa del historial.
 */
export async function generateHistoryTabReportPDF(
  records: RecentSaleHistoryRecord[],
  options: GenerateHistoryTabReportPdfOptions,
): Promise<void> {
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightEdge = pageWidth - margin;
  let y = margin;

  const rowHeight = 16;
  const xFecha = margin;
  const xId = margin + 118;
  const xPago = margin + 268;
  const xTotal = rightEdge;

  const ensureSpace = (needed: number): void => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Reporte de ${options.tabDisplayName}`, margin, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const generatedAt = new Intl.DateTimeFormat("es-AR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
  doc.text(`Generado: ${generatedAt}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Fecha", xFecha, y);
  doc.text("ID", xId, y);
  doc.text("Método de pago", xPago, y);
  doc.text("Total", xTotal, y, { align: "right" });
  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, rightEdge, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const record of records) {
    ensureSpace(rowHeight + 8);
    const fecha = formatArgentinaSaleDate(record.createdAt);
    const idDisplay = truncateId(record.saleIdentifier, 40);
    const pago = formatPaymentMethodLabel(record.paymentMethod);
    const totalStr = formatArgentinaPesos(record.totalAmount);

    doc.text(fecha, xFecha, y);
    doc.text(idDisplay, xId, y);
    doc.text(pago, xPago, y);
    doc.text(totalStr, xTotal, y, { align: "right" });
    y += rowHeight;
  }

  const totalAcumulado = records.reduce(
    (sum, record) => sum + record.totalAmount,
    0,
  );
  y += 12;
  ensureSpace(30);
  doc.setDrawColor(80, 80, 80);
  doc.line(margin, y, rightEdge, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    `Total acumulado: ${formatArgentinaPesos(totalAcumulado)}`,
    margin,
    y,
  );

  const slug = options.tabDisplayName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  doc.save(`reporte-${slug || "historial"}.pdf`);
}
