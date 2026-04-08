"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Banknote,
  CalendarClock,
  Clock,
  Info,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import type { Product } from "@/types/database";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import type { SalesSessionHistoryRow } from "@/services/salesSessionService";

type ProductFormModalMode = "closed" | "create" | "edit";

const MODAL_CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

const PREMIUM_MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6";

const PREMIUM_MODAL_PANEL_CLASS =
  "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/10 ring-1 ring-zinc-950/[0.04] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/[0.06]";

const TABLE_HEAD_CELL =
  "px-3 py-4 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400";

const TABLE_HEAD_CELL_RIGHT =
  "px-3 py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400";

const TABLE_TD_CLASS = "px-3 py-4";

const TABLE_ROW_CLASS =
  "transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40";

const TABLE_HEAD_ROW_CLASS =
  "border-b border-zinc-200 bg-transparent dark:border-zinc-700";

/** Misma paleta de éxito que MODAL_PRIMARY_ACTION del operador (emerald-600 + sombra). */
const CASH_DIFFERENCE_OK_BADGE_CLASS =
  "inline-flex rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-white shadow-md shadow-emerald-600/30";

const ADMIN_LAUNCHER_CARD_BASE_CLASS =
  "flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900";

const ADMIN_LAUNCHER_CARD_HOVER_CLASS =
  "hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95";

const ADMIN_LAUNCHER_CARD_TITLE_CLASS =
  "text-xl font-bold text-zinc-900 dark:text-zinc-100";

const ADMIN_LAUNCHER_CARD_DESCRIPTION_CLASS =
  "max-w-xs px-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400";

interface AdminTableModalProperties {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  panelMaxWidthClassName: string;
  children: ReactNode;
  /** Contenido opcional junto al título (p. ej. icono de ayuda). */
  titleAccessory?: ReactNode;
}

function AdminTableModal({
  isOpen,
  onClose,
  title,
  panelMaxWidthClassName,
  children,
  titleAccessory,
}: AdminTableModalProperties): ReactElement | null {
  const titleHeadingId = useId();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`${PREMIUM_MODAL_BACKDROP_CLASS} admin-modal-backdrop-in`}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`${PREMIUM_MODAL_PANEL_CLASS} ${panelMaxWidthClassName} admin-modal-panel-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleHeadingId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              id={titleHeadingId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {title}
            </h2>
            {titleAccessory ?? null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex min-h-0 max-h-[min(78dvh,880px)] flex-1 flex-col overflow-hidden px-5 pb-5 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
}

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

function formatArgentinaDateTime(isoDateString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));
}

function displayOrDash(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? "—" : trimmed;
}

function isCashDifferenceZero(value: number): boolean {
  return Math.abs(value) < 0.0005;
}

function hasCriticalMarginIssue(product: Product): boolean {
  const cost = product.costPrice;
  if (cost === null || cost === undefined || !Number.isFinite(cost)) {
    return false;
  }
  return product.price <= cost;
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

function SessionTypeCell({ sessionType }: { sessionType: string }): ReactElement {
  const label = formatSessionTypeLabel(sessionType);
  if (sessionType === "RECREO") {
    return (
      <span className="inline-flex items-center gap-2">
        <Clock className="size-4 shrink-0 text-zinc-500" aria-hidden />
        <span>{label}</span>
      </span>
    );
  }
  if (sessionType === "VENTA_LIBRE") {
    return (
      <span className="inline-flex items-center gap-2">
        <ShoppingCart className="size-4 shrink-0 text-zinc-500" aria-hidden />
        <span>{label}</span>
      </span>
    );
  }
  return <span>{label}</span>;
}

function SessionStatusBadge({ status }: { status: string }): ReactElement {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        ACTIVA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      FINALIZADA
    </span>
  );
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
        if (response.ok) {
          setSalesSessionsHistory(responseBody.salesSessionsHistory ?? []);
        }
      } catch {
        setSalesSessionsHistory([]);
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

  const patchProductIsActive = useCallback(
    async (
      productIdentifier: string,
      nextIsActive: boolean,
    ): Promise<boolean> => {
      setPageErrorMessage("");

      try {
        const response = await fetch(`/api/products/${productIdentifier}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextIsActive }),
        });

        const responseBody = (await response.json()) as SingleProductApiResponse;

        if (response.status === 401) {
          window.location.assign("/login");
          return false;
        }

        if (!response.ok) {
          setPageErrorMessage(
            responseBody.message ??
              (nextIsActive
                ? "No se pudo activar el producto."
                : "No se pudo desactivar el producto."),
          );
          return false;
        }

        await loadProductListFromServer();
        return true;
      } catch {
        setPageErrorMessage(
          nextIsActive
            ? "No se pudo activar el producto."
            : "No se pudo desactivar el producto.",
        );
        return false;
      }
    },
    [loadProductListFromServer],
  );

  const handleToggleProductActive = useCallback(
    async (product: Product): Promise<void> => {
      if (product.isActive) {
        const confirmed = window.confirm(
          "¿Desactivar este producto? El registro se conservará pero dejará de estar activo.",
        );
        if (!confirmed) {
          return;
        }
        await patchProductIsActive(product.id, false);
        return;
      }

      if (product.currentStock <= 0) {
        return;
      }

      const confirmed = window.confirm(
        "¿Activar este producto? Volverá a estar disponible en el catálogo.",
      );
      if (!confirmed) {
        return;
      }

      await patchProductIsActive(product.id, true);
    },
    [patchProductIsActive],
  );

  const isProductFormModalOpen = productFormModalMode !== "closed";

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Package className="size-6 text-zinc-700 dark:text-zinc-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 md:text-2xl">
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

      <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="mx-auto w-full max-w-6xl">
          <section className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <button
              type="button"
              onClick={() => setIsProductsPanelOpen(true)}
              className={`${ADMIN_LAUNCHER_CARD_BASE_CLASS} ${ADMIN_LAUNCHER_CARD_HOVER_CLASS} hover:border-emerald-400 dark:hover:border-emerald-500`}
            >
              <Package className="size-16 shrink-0 text-emerald-600 dark:text-emerald-500" aria-hidden />
              <p className={ADMIN_LAUNCHER_CARD_TITLE_CLASS}>Productos</p>
              <p className={ADMIN_LAUNCHER_CARD_DESCRIPTION_CLASS}>
                Gestión completa del catálogo.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setIsCashClosuresPanelOpen(true)}
              className={`${ADMIN_LAUNCHER_CARD_BASE_CLASS} ${ADMIN_LAUNCHER_CARD_HOVER_CLASS} hover:border-orange-400 dark:hover:border-orange-500`}
            >
              <Banknote className="size-16 shrink-0 text-orange-600 dark:text-orange-500" aria-hidden />
              <p className={ADMIN_LAUNCHER_CARD_TITLE_CLASS}>Cierres de caja</p>
              <p className={ADMIN_LAUNCHER_CARD_DESCRIPTION_CLASS}>
                Resumen de arqueos y diferencias.
              </p>
            </button>
            <button
              type="button"
              onClick={() => setIsSessionsHistoryPanelOpen(true)}
              className={`${ADMIN_LAUNCHER_CARD_BASE_CLASS} ${ADMIN_LAUNCHER_CARD_HOVER_CLASS} hover:border-blue-400 dark:hover:border-blue-500`}
            >
              <CalendarClock className="size-16 shrink-0 text-blue-600 dark:text-blue-500" aria-hidden />
              <p className={ADMIN_LAUNCHER_CARD_TITLE_CLASS}>Historial de sesiones</p>
              <p className={ADMIN_LAUNCHER_CARD_DESCRIPTION_CLASS}>
                Recreos y ventas libres por sesión.
              </p>
            </button>
          </section>
        </div>
      </div>

      </div>

      <AdminTableModal
        isOpen={isProductsPanelOpen}
        onClose={() => setIsProductsPanelOpen(false)}
        title="Productos"
        panelMaxWidthClassName="max-w-7xl"
        titleAccessory={
          <span
            className="inline-flex shrink-0 cursor-help text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            title="Puedes editar cualquier producto haciendo clic directamente sobre su nombre"
            aria-label="Puedes editar cualquier producto haciendo clic directamente sobre su nombre"
          >
            <Info className="size-5" aria-hidden />
          </span>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="relative w-full shrink-0 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={productSearchQuery}
              onChange={(event) => setProductSearchQuery(event.target.value)}
              placeholder="Buscar por nombre, categoría o código…"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW_CLASS}>
                <th className={TABLE_HEAD_CELL}>Nombre</th>
                <th className={TABLE_HEAD_CELL}>Código de barras</th>
                <th className={TABLE_HEAD_CELL}>Categoría</th>
                <th className={TABLE_HEAD_CELL}>Costo</th>
                <th className={TABLE_HEAD_CELL}>PVP (venta)</th>
                <th className={TABLE_HEAD_CELL}>Stock</th>
                <th className={TABLE_HEAD_CELL_RIGHT}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {isLoadingProductList ? (
                <tr>
                  <td
                    colSpan={7}
                    className={`${TABLE_TD_CLASS} text-center text-zinc-500`}
                  >
                    Cargando productos...
                  </td>
                </tr>
              ) : (
                filteredProductList.map((product) => {
                  const costValue = product.costPrice;
                  const hasCost =
                    costValue !== null &&
                    costValue !== undefined &&
                    Number.isFinite(costValue);
                  const marginAlert = hasCriticalMarginIssue(product);
                  const costDisplay = hasCost
                    ? formatArgentinaPesos(costValue)
                    : "—";
                  const costCellClass = !hasCost
                    ? "text-zinc-600 dark:text-zinc-400"
                    : marginAlert
                      ? "font-mono tabular-nums font-medium text-rose-600 dark:text-rose-400"
                      : "font-mono tabular-nums font-medium text-orange-600 dark:text-orange-400";
                  const pvpCellClass = marginAlert
                    ? "font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400"
                    : "font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400";
                  const isActivateBlocked =
                    !product.isActive && product.currentStock <= 0;
                  const inactiveRowCellClass = !product.isActive
                    ? "opacity-50"
                    : "";

                  return (
                    <tr
                      key={product.id}
                      className={`bg-white dark:bg-zinc-900 ${TABLE_ROW_CLASS}`}
                    >
                      <td className={`${TABLE_TD_CLASS} ${inactiveRowCellClass}`}>
                        <button
                          type="button"
                          onClick={() => openEditProductModal(product)}
                          title="Haz clic para editar los detalles del producto"
                          className="cursor-pointer text-left font-bold text-zinc-900 underline-offset-2 transition-colors hover:text-blue-600 hover:underline dark:text-zinc-100 dark:hover:text-blue-400"
                        >
                          {product.name}
                        </button>
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} font-bold text-zinc-900 dark:text-zinc-100 ${inactiveRowCellClass}`}
                      >
                        {product.sku.length > 0 ? product.sku : "—"}
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} font-medium text-zinc-500 dark:text-zinc-400 ${inactiveRowCellClass}`}
                      >
                        {product.category}
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} ${costCellClass} ${inactiveRowCellClass}`}
                      >
                        {costDisplay}
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} ${pvpCellClass} ${inactiveRowCellClass}`}
                      >
                        {formatArgentinaPesos(product.price)}
                      </td>
                      <td className={`${TABLE_TD_CLASS} ${inactiveRowCellClass}`}>
                        {product.currentStock}
                      </td>
                      <td className={`${TABLE_TD_CLASS} text-right`}>
                        <button
                          type="button"
                          disabled={isActivateBlocked}
                          title={
                            isActivateBlocked
                              ? "No se puede activar sin stock disponible. Ajuste el inventario primero."
                              : undefined
                          }
                          onClick={() =>
                            void handleToggleProductActive(product)
                          }
                          className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
                            product.isActive
                              ? "bg-transparent text-zinc-600 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
                              : isActivateBlocked
                                ? "bg-transparent text-zinc-600 hover:bg-emerald-50 hover:text-emerald-600 dark:text-zinc-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                                : "bg-transparent font-extrabold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                          }`}
                        >
                          {product.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </AdminTableModal>

      <AdminTableModal
        isOpen={isCashClosuresPanelOpen}
        onClose={() => setIsCashClosuresPanelOpen(false)}
        title="Cierres de caja"
        panelMaxWidthClassName="max-w-5xl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW_CLASS}>
                <th className={TABLE_HEAD_CELL}>Operador</th>
                <th className={TABLE_HEAD_CELL}>Cierre</th>
                <th className={TABLE_HEAD_CELL_RIGHT}>Total sesión</th>
                <th className={`${TABLE_HEAD_CELL_RIGHT} align-bottom`}>
                  <span className="inline-flex w-full items-center justify-end gap-1.5">
                    <span>Diferencia</span>
                    <span
                      className="inline-flex cursor-help text-zinc-400 transition-colors hover:text-zinc-500 dark:text-zinc-500 dark:hover:text-zinc-400"
                      title="La diferencia se calcula comparando el efectivo real contado contra el esperado del sistema"
                      aria-label="La diferencia se calcula comparando el efectivo real contado contra el esperado del sistema"
                    >
                      <Info className="size-3.5 shrink-0" aria-hidden />
                    </span>
                  </span>
                </th>
                <th className={`${TABLE_HEAD_CELL} text-center`}>
                  Justificación
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {cashClosureSessionsOnly.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className={`${TABLE_TD_CLASS} text-center text-sm text-zinc-500`}
                  >
                    No hay cierres de caja registrados en el historial cargado.
                  </td>
                </tr>
              ) : (
                cashClosureSessionsOnly.map((sessionRow) => {
                  const userIdentifierLabel = displayOrDash(
                    sessionRow.userIdentifier,
                  );
                  const primaryOperatorLine =
                    sessionRow.operatorFullName !== null &&
                    sessionRow.operatorFullName.trim().length > 0
                      ? sessionRow.operatorFullName
                      : userIdentifierLabel;
                  const closedByName = sessionRow.closedByFullName;
                  const showClosedBySubtitle =
                    closedByName !== null &&
                    closedByName.trim().length > 0 &&
                    closedByName !== primaryOperatorLine;
                  const differenceAmount = sessionRow.cashDifference ?? 0;
                  const expenseNotesText = displayOrDash(
                    sessionRow.expenseNotes,
                  );
                  const hasExpenseNotes = expenseNotesText !== "—";

                  return (
                    <tr
                      key={sessionRow.sessionIdentifier}
                      className={`bg-white dark:bg-zinc-900 ${TABLE_ROW_CLASS}`}
                    >
                      <td className={`${TABLE_TD_CLASS} align-top`}>
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">
                          {primaryOperatorLine}
                        </div>
                        {showClosedBySubtitle ? (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Cerró: {closedByName}
                          </p>
                        ) : null}
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} align-top text-zinc-800 dark:text-zinc-200`}
                      >
                        {sessionRow.closedAtIso
                          ? formatArgentinaDateTime(sessionRow.closedAtIso)
                          : "—"}
                      </td>
                      <td
                        className={`${TABLE_TD_CLASS} text-right align-top font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100`}
                      >
                        {formatArgentinaPesos(sessionRow.totalAmount)}
                      </td>
                      <td className={`${TABLE_TD_CLASS} text-right align-top`}>
                        {isCashDifferenceZero(differenceAmount) ? (
                          <span className={CASH_DIFFERENCE_OK_BADGE_CLASS}>
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                            {formatArgentinaPesos(differenceAmount)}
                          </span>
                        )}
                      </td>
                      <td className={`${TABLE_TD_CLASS} text-center align-top`}>
                        {hasExpenseNotes ? (
                          <span
                            title={sessionRow.expenseNotes ?? undefined}
                            className="inline-flex cursor-help text-zinc-500"
                            aria-label="Ver justificación de gastos (detalle en tooltip)"
                          >
                            <MessageSquare className="size-4" aria-hidden />
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </AdminTableModal>

      <AdminTableModal
        isOpen={isSessionsHistoryPanelOpen}
        onClose={() => setIsSessionsHistoryPanelOpen(false)}
        title="Historial de sesiones"
        panelMaxWidthClassName="max-w-6xl"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW_CLASS}>
                <th className={TABLE_HEAD_CELL}>Inicio</th>
                <th className={TABLE_HEAD_CELL}>Tipo</th>
                <th className={TABLE_HEAD_CELL}>Estado</th>
                <th className={TABLE_HEAD_CELL}>Operador</th>
                <th className={TABLE_HEAD_CELL}>Notas</th>
                <th className={TABLE_HEAD_CELL_RIGHT}>Total sesión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {salesSessionsHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`${TABLE_TD_CLASS} text-center text-sm text-zinc-500`}
                  >
                    No hay sesiones en el historial.
                  </td>
                </tr>
              ) : (
                salesSessionsHistory.map((sessionRow) => (
                  <tr
                    key={sessionRow.sessionIdentifier}
                    className={`bg-white dark:bg-zinc-900 ${TABLE_ROW_CLASS}`}
                  >
                    <td
                      className={`${TABLE_TD_CLASS} text-zinc-800 dark:text-zinc-200`}
                    >
                      {sessionRow.startedAtIso
                        ? formatArgentinaDateTime(sessionRow.startedAtIso)
                        : "—"}
                    </td>
                    <td
                      className={`${TABLE_TD_CLASS} text-zinc-900 dark:text-zinc-100`}
                    >
                      <SessionTypeCell sessionType={sessionRow.sessionType} />
                    </td>
                    <td className={TABLE_TD_CLASS}>
                      <SessionStatusBadge status={sessionRow.status} />
                    </td>
                    <td
                      className={`${TABLE_TD_CLASS} font-bold text-zinc-900 dark:text-zinc-100`}
                    >
                      {displayOrDash(sessionRow.operatorFullName) === "—"
                        ? displayOrDash(sessionRow.userIdentifier)
                        : displayOrDash(sessionRow.operatorFullName)}
                    </td>
                    <td
                      className={`max-w-[200px] truncate ${TABLE_TD_CLASS} text-zinc-700 dark:text-zinc-300`}
                    >
                      {displayOrDash(sessionRow.notes)}
                    </td>
                    <td
                      className={`${TABLE_TD_CLASS} text-right font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100`}
                    >
                      {formatArgentinaPesos(sessionRow.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </AdminTableModal>

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
