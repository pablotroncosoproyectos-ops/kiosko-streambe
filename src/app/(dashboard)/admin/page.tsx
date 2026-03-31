"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  Banknote,
  CalendarClock,
  Package,
  Plus,
  Search,
  Trash,
  X,
} from "lucide-react";
import type { Product } from "@/types/database";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { formatArgentinaPesos } from "@/lib/currencyFormat";

type ProductFormModalMode = "closed" | "create" | "edit";

interface ProductsListApiResponse {
  products?: Product[];
  message?: string;
}

interface SingleProductApiResponse {
  product?: Product;
  message?: string;
}

interface SalesSessionsHistoryApiResponse {
  salesSessionsHistory?: SalesSessionHistoryRow[];
  message?: string;
}

interface SalesSessionHistoryRow {
  sessionIdentifier: string;
  userIdentifier: string;
  operatorFullName: string | null;
  sessionType: string;
  status: string;
  totalAmount: number;
  startedAtIso: string;
  closedAtIso: string | null;
  notes: string | null;
  expectedBalance: number | null;
  closingBalance: number | null;
  cashDifference: number | null;
}

function formatArgentinaDateTime(isoDateString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));
}

const AdminDashboardPage = (): ReactElement => {
  const [productList, setProductList] = useState<Product[]>([]);
  const [isLoadingProductList, setIsLoadingProductList] =
    useState<boolean>(true);
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [productFormModalMode, setProductFormModalMode] =
    useState<ProductFormModalMode>("closed");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [pageErrorMessage, setPageErrorMessage] = useState<string>("");
  const [salesSessionsHistory, setSalesSessionsHistory] = useState<
    SalesSessionHistoryRow[]
  >([]);
  const [isLoadingSalesSessionsHistory, setIsLoadingSalesSessionsHistory] =
    useState<boolean>(true);
  const [salesSessionsHistoryErrorMessage, setSalesSessionsHistoryErrorMessage] =
    useState<string>("");
  const [isProductsPanelOpen, setIsProductsPanelOpen] = useState<boolean>(false);
  const [isCashClosuresPanelOpen, setIsCashClosuresPanelOpen] =
    useState<boolean>(false);
  const [isSessionsHistoryPanelOpen, setIsSessionsHistoryPanelOpen] =
    useState<boolean>(false);

  const cashClosureSessionsOnly = useMemo(() => {
    return salesSessionsHistory.filter((sessionRow) => {
      return (
        sessionRow.closedAtIso !== null &&
        sessionRow.cashDifference !== null &&
        sessionRow.expectedBalance !== null
      );
    });
  }, [salesSessionsHistory]);

  const filteredProductList = useMemo(() => {
    const normalizedSearch = productSearchQuery.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return productList;
    }
    return productList.filter((product) => {
      const nameMatches = product.name.toLowerCase().includes(normalizedSearch);
      const skuMatches = product.sku.toLowerCase().includes(normalizedSearch);
      const categoryMatches = product.category
        .toLowerCase()
        .includes(normalizedSearch);
      return nameMatches || skuMatches || categoryMatches;
    });
  }, [productList, productSearchQuery]);

  const loadProductListFromServer = useCallback(async (): Promise<void> => {
    setIsLoadingProductList(true);
    setPageErrorMessage("");

    try {
      const response = await fetch("/api/products", {
        method: "GET",
        credentials: "include",
      });

      const responseBody = (await response.json()) as ProductsListApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setPageErrorMessage(
          responseBody.message || "Unable to load product list",
        );
        return;
      }

      setProductList(responseBody.products ?? []);
    } catch {
      setPageErrorMessage("Unable to load product list");
    } finally {
      setIsLoadingProductList(false);
    }
  }, []);

  useEffect(() => {
    void loadProductListFromServer();
  }, [loadProductListFromServer]);

  const loadSalesSessionsHistoryFromServer =
    useCallback(async (): Promise<void> => {
      setIsLoadingSalesSessionsHistory(true);
      setSalesSessionsHistoryErrorMessage("");
      try {
        const response = await fetch("/api/sales-sessions/history?limit=100", {
          method: "GET",
          credentials: "include",
        });
        const responseBody =
          (await response.json()) as SalesSessionsHistoryApiResponse;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!response.ok) {
          setSalesSessionsHistoryErrorMessage(
            responseBody.message || "No se pudo cargar el historial de sesiones",
          );
          return;
        }
        setSalesSessionsHistory(responseBody.salesSessionsHistory ?? []);
      } catch {
        setSalesSessionsHistoryErrorMessage(
          "No se pudo cargar el historial de sesiones",
        );
      } finally {
        setIsLoadingSalesSessionsHistory(false);
      }
    }, []);

  useEffect(() => {
    void loadSalesSessionsHistoryFromServer();
  }, [loadSalesSessionsHistoryFromServer]);

  function openCreateProductModal(): void {
    setEditingProduct(null);
    setProductFormModalMode("create");
  }

  function openEditProductModal(product: Product): void {
    setEditingProduct(product);
    setProductFormModalMode("edit");
  }

  function closeProductFormModal(): void {
    setProductFormModalMode("closed");
    setEditingProduct(null);
  }

  async function handleSoftDeleteProduct(productIdentifier: string): Promise<void> {
    const confirmed = window.confirm(
      "¿Desactivar este producto? El registro se conservará pero dejará de estar activo.",
    );
    if (!confirmed) {
      return;
    }

    setPageErrorMessage("");

    try {
      const response = await fetch(`/api/products/${productIdentifier}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });

      const responseBody = (await response.json()) as SingleProductApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setPageErrorMessage(
          responseBody.message || "Unable to deactivate product",
        );
        return;
      }

      await loadProductListFromServer();
    } catch {
      setPageErrorMessage("Unable to deactivate product");
    }
  }

  function formatSessionTypeLabel(sessionType: string): string {
    if (sessionType === "RECREO") {
      return "Recreo";
    }
    if (sessionType === "VENTA_LIBRE") {
      return "Venta libre";
    }
    return sessionType;
  }

  const isProductFormModalOpen = productFormModalMode !== "closed";

  return (
    <main className="mx-auto min-h-0 w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <Package className="size-6 text-zinc-700 dark:text-zinc-200" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                Administración de productos
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Gestión de inventario y catálogo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateProductModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="size-4" />
              Nuevo producto
            </button>
          </div>
        </div>

        {pageErrorMessage.length > 0 ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {pageErrorMessage}
          </p>
        ) : null}

        <section className="grid h-[calc(100vh-260px)] grid-cols-1 gap-4 overflow-hidden lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setIsProductsPanelOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Package className="size-14 shrink-0 text-emerald-600" aria-hidden />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Productos</p>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Gestión completa del catálogo.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setIsCashClosuresPanelOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Banknote className="size-14 shrink-0 text-amber-600" aria-hidden />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Cierres de caja</p>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Resumen de arqueos y diferencias.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setIsSessionsHistoryPanelOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-sky-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <CalendarClock className="size-14 shrink-0 text-sky-600" aria-hidden />
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Historial de sesiones</p>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Recreos y ventas libres por sesión.
            </p>
          </button>
        </section>

        {isProductsPanelOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6">
            <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                <h2 className="text-lg font-semibold">Productos</h2>
                <button type="button" onClick={() => setIsProductsPanelOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                    <input type="search" value={productSearchQuery} onChange={(event) => setProductSearchQuery(event.target.value)} placeholder="Buscar por nombre, categoría o código…" className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800" />
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[880px] text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                      <tr>
                        <th className="px-4 py-3 font-medium">Nombre</th>
                        <th className="px-4 py-3 font-medium">Código de barras</th>
                        <th className="px-4 py-3 font-medium">Categoría</th>
                        <th className="px-4 py-3 font-medium">PVP (venta)</th>
                        <th className="px-4 py-3 font-medium">Costo</th>
                        <th className="px-4 py-3 font-medium">Stock</th>
                        <th className="px-4 py-3 font-medium text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {filteredProductList.map((product) => (
                        <tr key={product.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50">
                          <td className="px-4 py-3 font-medium">{product.name}</td>
                          <td className="px-4 py-3">{product.sku.length > 0 ? product.sku : "—"}</td>
                          <td className="px-4 py-3">{product.category}</td>
                          <td className="px-4 py-3 tabular-nums">{formatArgentinaPesos(product.price)}</td>
                          <td className="px-4 py-3 tabular-nums">{product.costPrice === null || product.costPrice === undefined ? "—" : formatArgentinaPesos(product.costPrice)}</td>
                          <td className="px-4 py-3">{product.currentStock}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => openEditProductModal(product)} className="mr-2 rounded-lg border border-zinc-300 px-2 py-1 text-xs">Editar</button>
                            <button type="button" onClick={() => void handleSoftDeleteProduct(product.id)} className="rounded-lg border border-zinc-300 px-2 py-1 text-xs text-red-600">Desactivar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isCashClosuresPanelOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                <h2 className="text-lg font-semibold">Cierres de caja</h2>
                <button type="button" onClick={() => setIsCashClosuresPanelOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                      <tr>
                        <th className="px-3 py-3 font-medium">Operador</th>
                        <th className="px-3 py-3 font-medium">Cierre</th>
                        <th className="px-3 py-3 font-medium text-right">Total sesión</th>
                        <th className="px-3 py-3 font-medium text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {cashClosureSessionsOnly.map((sessionRow) => (
                        <tr key={sessionRow.sessionIdentifier}>
                          <td className="px-3 py-3">{sessionRow.operatorFullName ?? sessionRow.userIdentifier}</td>
                          <td className="px-3 py-3">{sessionRow.closedAtIso ? formatArgentinaDateTime(sessionRow.closedAtIso) : "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatArgentinaPesos(sessionRow.totalAmount)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatArgentinaPesos(sessionRow.cashDifference ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isSessionsHistoryPanelOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                <h2 className="text-lg font-semibold">Historial de sesiones</h2>
                <button type="button" onClick={() => setIsSessionsHistoryPanelOpen(false)} className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-5" /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-5">
                <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                      <tr>
                        <th className="px-3 py-3 font-medium">Inicio</th>
                        <th className="px-3 py-3 font-medium">Tipo</th>
                        <th className="px-3 py-3 font-medium">Estado</th>
                        <th className="px-3 py-3 font-medium">Operador</th>
                        <th className="px-3 py-3 font-medium">Notas</th>
                        <th className="px-3 py-3 font-medium text-right">Total sesión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                      {salesSessionsHistory.map((sessionRow) => (
                        <tr key={sessionRow.sessionIdentifier}>
                          <td className="px-3 py-3">{sessionRow.startedAtIso ? formatArgentinaDateTime(sessionRow.startedAtIso) : "—"}</td>
                          <td className="px-3 py-3">{formatSessionTypeLabel(sessionRow.sessionType)}</td>
                          <td className="px-3 py-3">{sessionRow.status === "OPEN" ? "Abierta" : "Cerrada"}</td>
                          <td className="px-3 py-3">{sessionRow.operatorFullName ?? sessionRow.userIdentifier}</td>
                          <td className="px-3 py-3">{sessionRow.notes ?? "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{formatArgentinaPesos(sessionRow.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

      <ProductFormModal
        isOpen={isProductFormModalOpen}
        onClose={closeProductFormModal}
        mode={productFormModalMode === "edit" ? "edit" : "create"}
        initialProduct={productFormModalMode === "edit" ? editingProduct : null}
        editingProductId={editingProduct?.id ?? null}
        productList={productList}
        onSuccess={loadProductListFromServer}
      />
    </main>
  );
};

export default AdminDashboardPage;
