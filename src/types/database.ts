/** Fila de `public.categories` (nombre en MAYÚSCULAS). */
export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "OPERATOR";
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  /** Categoría libre (columna TEXT en base de datos) */
  category: string;
  imageUrl: string | null;
  /** Precio de venta al público */
  price: number;
  /** Precio de costo (opcional; requiere columna `cost_price` en Supabase) */
  costPrice: number | null;
  /** Producto vendido por fracción de una unidad base */
  isBulk: boolean;
  /** Cantidad de unidades internas por stock base (ej: pack 6) */
  quantityPerUnit: number | null;
  /** Producto combo compuesto por otros productos */
  isCombo: boolean;
  currentStock: number;
  isActive: boolean;
  createdAt: string;
}

export interface SalesSession {
  id: string;
  userId: string;
  sessionType: "RECREO" | "VENTA_LIBRE";
  status: "OPEN" | "CLOSED";
  totalAmount: number;
  startedAt: string;
  closedAt: string | null;
  /** Notas opcionales (ej. identificación del recreo) */
  notes: string | null;
  /** Arqueo de caja (columnas opcionales en BD) */
  openingBalance?: number | null;
  expensesTotal?: number | null;
  expectedBalance?: number | null;
  closingBalance?: number | null;
  cashDifference?: number | null;
}

export interface Sale {
  id: string;
  sessionId: string;
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  totalPrice: number;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  /** Costo unitario al momento de la venta (histórico) */
  unitCost: number | null;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  userId: string;
  quantity: number;
  movementType: "IN" | "OUT" | "OUT_SALE" | "ADJUSTMENT" | "EXPIRED";
  reason: string;
  createdAt: string;
}
