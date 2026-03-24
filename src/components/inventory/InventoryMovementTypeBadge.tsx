import type { ReactElement } from "react";

interface InventoryMovementTypeBadgeProperties {
  movementType: string;
}

/**
 * Badge de tipo de movimiento de inventario (colores unificados en la aplicación).
 */
export function InventoryMovementTypeBadge({
  movementType,
}: InventoryMovementTypeBadgeProperties): ReactElement {
  const normalizedMovementType = movementType.trim().toUpperCase();

  if (normalizedMovementType === "IN") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        ENTRADA
      </span>
    );
  }

  if (normalizedMovementType === "OUT_SALE") {
    return (
      <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200">
        VENTA
      </span>
    );
  }

  if (normalizedMovementType === "ADJUSTMENT") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
        AJUSTE
      </span>
    );
  }

  if (normalizedMovementType === "EXPIRED") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
        VENCIDO
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200">
      {movementType.length > 0 ? movementType : "DESCONOCIDO"}
    </span>
  );
}
