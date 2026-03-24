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
  category: "DULCE" | "SALADO" | "SNACK" | "BEBIDA" | "FRUTA" | "LIBRERIA";
  imageUrl: string | null;
  price: number;
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
}

export interface InventoryMovement {
  id: string;
  productId: string;
  userId: string;
  quantity: number;
  movementType: "IN" | "OUT_SALE" | "ADJUSTMENT" | "EXPIRED";
  reason: string;
  createdAt: string;
}
