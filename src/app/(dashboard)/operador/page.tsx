"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import {
  AlertTriangle,
  CreditCard,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Landmark,
  Minus,
  Package,
  Plus,
  QrCode,
  ScanLine,
  ShoppingCart,
  Trash2,
  Banknote,
  Warehouse,
  X,
} from "lucide-react";
import type { Product } from "@/types/database";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { BarcodeCameraScanner } from "@/components/admin/BarcodeCameraScanner";
import { ProductFormModal } from "@/components/admin/ProductFormModal";

interface CartItem {
  productIdentifier: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number | null;
  useCostPrice: boolean;
}

interface ProductsApiResponse {
  products?: Product[];
  message?: string;
}

interface SalesApiResponse {
  message: string;
  saleIdentifier?: string;
  totalSaleAmount?: number;
}

const MISSING_OPEN_SESSION_UI_MESSAGE =
  "Debe abrir una sesión (Caja/Recreo) antes de realizar una venta.";

const PAYMENT_METHOD_OPTIONS = [
  { value: "EFECTIVO", label: "Efectivo", icon: Banknote },
  { value: "DEBITO", label: "Débito", icon: CreditCard },
  { value: "TRANSFERENCIA", label: "Transfer.", icon: Landmark },
  { value: "QR", label: "QR", icon: QrCode },
] as const;

interface RecentSaleHistoryRecord {
  saleIdentifier: string;
  totalAmount: number;
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  createdAt: string;
  productNamesSummary: string;
  sellerFullName: string;
  sellerRole: string;
}

interface RecentSalesHistoryApiResponse {
  recentSalesHistory?: RecentSaleHistoryRecord[];
  historyScope?: "ventaLibre" | "recreo" | "ventaTotal";
  message?: string;
}

type SelectedPaymentMethod = "EFECTIVO" | "DEBITO" | "TRANSFERENCIA" | "QR";
type CatalogBrowseMode = "categories" | "search";
type SaleHistoryTab = "ventaLibre" | "recreo" | "ventaTotal";
type OperatorCashSessionState = "loading" | "noSession" | "hasSession";

/** Mismo estilo glass que el modal de producto en Admin */
const OPERATOR_GLASS_MODAL_BACKDROP =
  "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md transition-opacity duration-300 ease-out dark:bg-zinc-950/55 md:p-6";

const OPERATOR_GLASS_MODAL_PANEL =
  "flex max-h-[min(100dvh,100vh)] w-full max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:max-h-[min(92vh,900px)] md:max-w-7xl";

const FEEDBACK_DISPLAY_TIME_MILLISECONDS = 900;
const DEFAULT_BREAK_DURATION_MINUTES = 15;
const BREAK_END_TIME_STORAGE_KEY = "breakEndTimeTimestamp";
const LOW_STOCK_PREVIEW_COUNT = 5;
const LOW_STOCK_MODAL_PAGE_SIZE = 20;
const CART_PAGE_SIZE = 10;
const MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH = 2000;

function formatRemainingTime(remainingTimeSeconds: number): string {
  const minutes = Math.floor(remainingTimeSeconds / 60);
  const seconds = remainingTimeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatPaymentMethodLabel(
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

function formatArgentinaSaleDate(isoString: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoString));
}

function isMissingOpenSessionSaleMessage(rawMessage: string): boolean {
  const normalized = rawMessage.toLowerCase();
  return (
    normalized.includes("no se encontró una sesión abierta") ||
    normalized.includes("debe abrir una sesión")
  );
}

const OperadorDashboardPage = (): ReactElement => {
  const scannerInputReference = useRef<HTMLInputElement>(null);
  const previousSaleItemsListLengthReference = useRef<number>(0);
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<SelectedPaymentMethod>("EFECTIVO");
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(
    DEFAULT_BREAK_DURATION_MINUTES,
  );
  const [operatorCashSessionState, setOperatorCashSessionState] =
    useState<OperatorCashSessionState>("loading");
  const [openingBalanceInitialInput, setOpeningBalanceInitialInput] =
    useState<string>("0");
  const [openCashErrorMessage, setOpenCashErrorMessage] =
    useState<string>("");
  const [isOpeningCashSession, setIsOpeningCashSession] =
    useState<boolean>(false);
  const [recreoBreakDisplay, setRecreoBreakDisplay] = useState<{
    recreoSessionsStartedTodayCount: number;
    displayBreakIndex: number;
    maxBreaksPerDay: number;
  } | null>(null);
  const [isStartingRecreoSession, setIsStartingRecreoSession] =
    useState<boolean>(false);
  const [recreoStartErrorMessage, setRecreoStartErrorMessage] =
    useState<string>("");
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<number>(0);
  const [isBreakActive, setIsBreakActive] = useState<boolean>(false);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [saleItemsList, setSaleItemsList] = useState<CartItem[]>([]);
  const [isLoadingProductsCatalog, setIsLoadingProductsCatalog] =
    useState<boolean>(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [saleNotesInput, setSaleNotesInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSessionMissingError, setIsSessionMissingError] =
    useState<boolean>(false);
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<string>("");
  const [recentSalesVentaLibre, setRecentSalesVentaLibre] = useState<
    RecentSaleHistoryRecord[]
  >([]);
  const [recentSalesRecreo, setRecentSalesRecreo] = useState<
    RecentSaleHistoryRecord[]
  >([]);
  const [recentSalesVentaTotal, setRecentSalesVentaTotal] = useState<
    RecentSaleHistoryRecord[]
  >([]);
  const [saleHistoryTab, setSaleHistoryTab] =
    useState<SaleHistoryTab>("ventaTotal");

  const [isSaleModalOpen, setIsSaleModalOpen] = useState<boolean>(false);
  const [saleModalBackdropVisible, setSaleModalBackdropVisible] =
    useState<boolean>(false);
  const [isSaleHistoryPanelOpen, setIsSaleHistoryPanelOpen] =
    useState<boolean>(false);
  const [cartPageIndex, setCartPageIndex] = useState<number>(0);
  const [isQuickLoadModalOpen, setIsQuickLoadModalOpen] =
    useState<boolean>(false);
  const [isBarcodeCameraScannerOpen, setIsBarcodeCameraScannerOpen] =
    useState<boolean>(false);
  const [isStockToolsModalOpen, setIsStockToolsModalOpen] =
    useState<boolean>(false);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] =
    useState<boolean>(false);
  const [quickLoadModalBackdropVisible, setQuickLoadModalBackdropVisible] =
    useState<boolean>(false);
  const [isLowStockAllModalOpen, setIsLowStockAllModalOpen] =
    useState<boolean>(false);
  const [quickLoadSearchQuery, setQuickLoadSearchQuery] = useState<string>("");
  const [catalogBrowseMode, setCatalogBrowseMode] =
    useState<CatalogBrowseMode>("categories");
  const [quickLoadSelectedCategory, setQuickLoadSelectedCategory] = useState<
    string | "ALL"
  >("ALL");
  const [stockAdjustmentProduct, setStockAdjustmentProduct] =
    useState<Product | null>(null);
  const [stockAdjustmentNewStockInput, setStockAdjustmentNewStockInput] =
    useState<string>("");
  const [stockAdjustmentReasonInput, setStockAdjustmentReasonInput] =
    useState<string>("");
  const [isSavingStockAdjustment, setIsSavingStockAdjustment] =
    useState<boolean>(false);
  const [stockAdjustmentErrorMessage, setStockAdjustmentErrorMessage] =
    useState<string>("");
  const [isCloseCashModalOpen, setIsCloseCashModalOpen] =
    useState<boolean>(false);
  const [physicalCashInput, setPhysicalCashInput] = useState<string>("");
  const [openingBalanceCashInput, setOpeningBalanceCashInput] =
    useState<string>("");
  const [expensesCashInput, setExpensesCashInput] = useState<string>("");
  const [cashSummaryPayload, setCashSummaryPayload] = useState<{
    sessionIdentifier: string;
    sessionType: string;
    openingBalance: number;
    expensesTotal: number;
    cashSalesTotal: number;
    expectedCashBalance: number;
  } | null>(null);
  const [isLoadingCashSummary, setIsLoadingCashSummary] =
    useState<boolean>(false);
  const [closeCashErrorMessage, setCloseCashErrorMessage] =
    useState<string>("");
  const [isSubmittingCloseCash, setIsSubmittingCloseCash] =
    useState<boolean>(false);
  const [shiftClosingNotesInput, setShiftClosingNotesInput] =
    useState<string>("");
  const [lowStockModalPageIndex, setLowStockModalPageIndex] =
    useState<number>(0);

  const totalSaleAmount = useMemo(() => {
    return saleItemsList.reduce((accumulator, saleItem) => {
      return accumulator + saleItem.quantity * saleItem.unitPrice;
    }, 0);
  }, [saleItemsList]);

  const lowStockProductsList = useMemo(() => {
    return productsCatalog.filter((product) => product.currentStock < 5);
  }, [productsCatalog]);

  const cartTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(saleItemsList.length / CART_PAGE_SIZE));
  }, [saleItemsList.length]);

  const pagedCartItems = useMemo(() => {
    const start = cartPageIndex * CART_PAGE_SIZE;
    return saleItemsList.slice(start, start + CART_PAGE_SIZE);
  }, [cartPageIndex, saleItemsList]);

  const lowStockPreviewList = useMemo(() => {
    return lowStockProductsList.slice(0, LOW_STOCK_PREVIEW_COUNT);
  }, [lowStockProductsList]);

  const lowStockModalTotalPages = useMemo(() => {
    return Math.max(
      1,
      Math.ceil(lowStockProductsList.length / LOW_STOCK_MODAL_PAGE_SIZE),
    );
  }, [lowStockProductsList.length]);

  const lowStockModalSlice = useMemo(() => {
    const start = lowStockModalPageIndex * LOW_STOCK_MODAL_PAGE_SIZE;
    return lowStockProductsList.slice(
      start,
      start + LOW_STOCK_MODAL_PAGE_SIZE,
    );
  }, [lowStockProductsList, lowStockModalPageIndex]);

  const catalogUniqueCategoryList = useMemo(() => {
    const categoryLabelSet = new Set<string>();
    for (const product of productsCatalog) {
      const categoryLabel = product.category.trim();
      if (categoryLabel.length > 0) {
        categoryLabelSet.add(categoryLabel);
      }
    }
    return Array.from(categoryLabelSet).sort((categoryA, categoryB) =>
      categoryA.localeCompare(categoryB, "es"),
    );
  }, [productsCatalog]);

  const quickLoadDisplayedProducts = useMemo(() => {
    const base = productsCatalog.filter((product) => product.isActive);
    const normalizedQuery = quickLoadSearchQuery.trim().toLowerCase();

    const sortByName = (list: Product[]): Product[] =>
      [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));

    if (catalogBrowseMode === "search") {
      const filtered =
        normalizedQuery.length === 0
          ? base
          : base.filter((product) =>
              product.name.toLowerCase().includes(normalizedQuery),
            );
      return sortByName(filtered);
    }

    const filtered =
      quickLoadSelectedCategory === "ALL"
        ? base
        : base.filter((product) => product.category === quickLoadSelectedCategory);
    return sortByName(filtered);
  }, [
    productsCatalog,
    quickLoadSearchQuery,
    catalogBrowseMode,
    quickLoadSelectedCategory,
  ]);

  const recentSalesForActiveHistoryTab = useMemo(() => {
    if (saleHistoryTab === "ventaLibre") {
      return recentSalesVentaLibre;
    }
    if (saleHistoryTab === "recreo") {
      return recentSalesRecreo;
    }
    return recentSalesVentaTotal;
  }, [
    recentSalesRecreo,
    recentSalesVentaLibre,
    recentSalesVentaTotal,
    saleHistoryTab,
  ]);

  const canSubmitStockAdjustment = useMemo(() => {
    if (stockAdjustmentProduct === null || isSavingStockAdjustment) {
      return false;
    }
    const parsedNewStock = Number.parseInt(stockAdjustmentNewStockInput, 10);
    if (!Number.isFinite(parsedNewStock) || parsedNewStock < 0) {
      return false;
    }
    if (parsedNewStock === stockAdjustmentProduct.currentStock) {
      return false;
    }
    if (parsedNewStock < stockAdjustmentProduct.currentStock) {
      return stockAdjustmentReasonInput.trim().length > 0;
    }
    return true;
  }, [
    stockAdjustmentProduct,
    stockAdjustmentNewStockInput,
    stockAdjustmentReasonInput,
    isSavingStockAdjustment,
  ]);

  const stockAdjustmentIsReduction = useMemo(() => {
    if (stockAdjustmentProduct === null) {
      return false;
    }
    const parsedNewStock = Number.parseInt(stockAdjustmentNewStockInput, 10);
    if (!Number.isFinite(parsedNewStock)) {
      return false;
    }
    return parsedNewStock < stockAdjustmentProduct.currentStock;
  }, [stockAdjustmentProduct, stockAdjustmentNewStockInput]);

  const isUserInteractingWithControls = (): boolean => {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement)) {
      return false;
    }

    const activeElementTagName = activeElement.tagName.toLowerCase();
    const isFormControl =
      activeElementTagName === "input" ||
      activeElementTagName === "select" ||
      activeElementTagName === "textarea";

    if (!isFormControl) {
      return false;
    }

    return activeElement.id !== "scanned-barcode-input";
  };

  const ensureScannerFocus = (): void => {
    if (!isSaleModalOpen) {
      return;
    }
    if (isUserInteractingWithControls()) {
      return;
    }
    scannerInputReference.current?.focus();
  };

  const mapSelectedPaymentMethodToApiPaymentMethod = (): "CASH" | "DEBIT" | "TRANSFER" | "QR" => {
    if (selectedPaymentMethod === "DEBITO") {
      return "DEBIT";
    }
    if (selectedPaymentMethod === "TRANSFERENCIA") {
      return "TRANSFER";
    }
    if (selectedPaymentMethod === "QR") {
      return "QR";
    }
    return "CASH";
  };

  const loadProductsCatalog = useCallback(async (): Promise<void> => {
    setIsLoadingProductsCatalog(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/products", {
        method: "GET",
        credentials: "include",
      });
      const responseBody = (await response.json()) as ProductsApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(responseBody.message || "No se pueden cargar productos");
        return;
      }

      const activeProducts = (responseBody.products || []).filter(
        (product) => product.isActive,
      );
      setProductsCatalog(activeProducts);
    } catch {
      setErrorMessage("No se pueden cargar productos");
    } finally {
      setIsLoadingProductsCatalog(false);
    }
  }, []);

  const loadRecentSalesHistory = useCallback(async (): Promise<void> => {
    try {
      const [ventaLibreResponse, recreoResponse, ventaTotalResponse] =
        await Promise.all([
          fetch("/api/sales/recent?historyScope=ventaLibre", {
            method: "GET",
            credentials: "include",
          }),
          fetch("/api/sales/recent?historyScope=recreo", {
            method: "GET",
            credentials: "include",
          }),
          fetch("/api/sales/recent?historyScope=ventaTotal", {
            method: "GET",
            credentials: "include",
          }),
        ]);

      if (
        ventaLibreResponse.status === 401 ||
        recreoResponse.status === 401 ||
        ventaTotalResponse.status === 401
      ) {
        window.location.assign("/login");
        return;
      }

      const ventaLibreBody =
        (await ventaLibreResponse.json()) as RecentSalesHistoryApiResponse;
      const recreoBody = (await recreoResponse.json()) as RecentSalesHistoryApiResponse;
      const ventaTotalBody =
        (await ventaTotalResponse.json()) as RecentSalesHistoryApiResponse;

      if (ventaLibreResponse.ok) {
        setRecentSalesVentaLibre(ventaLibreBody.recentSalesHistory || []);
      }
      if (recreoResponse.ok) {
        setRecentSalesRecreo(recreoBody.recentSalesHistory || []);
      }
      if (ventaTotalResponse.ok) {
        setRecentSalesVentaTotal(ventaTotalBody.recentSalesHistory || []);
      }
    } catch {
      // Keep UI usable if sales history is unavailable.
    }
  }, []);

  const loadOperatorCashSessionStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/sales-sessions/cash-summary", {
        method: "GET",
        credentials: "include",
      });
      const responseBody = (await response.json()) as {
        cashSummary?: {
          sessionIdentifier: string;
          sessionType: string;
          openingBalance: number;
          expensesTotal: number;
          cashSalesTotal: number;
          expectedCashBalance: number;
        } | null;
        message?: string;
      };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setOperatorCashSessionState("noSession");
        setProductsCatalog([]);
        return;
      }
      if (responseBody.cashSummary !== undefined && responseBody.cashSummary !== null) {
        setOperatorCashSessionState("hasSession");
      } else {
        setOperatorCashSessionState("noSession");
        setProductsCatalog([]);
      }
    } catch {
      setOperatorCashSessionState("noSession");
      setProductsCatalog([]);
    }
  }, []);

  const loadRecreoBreakDisplay = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/sales-sessions/recreo-break", {
        method: "GET",
        credentials: "include",
      });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        return;
      }
      const responseBody = (await response.json()) as {
        recreoSessionsStartedTodayCount: number;
        displayBreakIndex: number;
        maxBreaksPerDay: number;
      };
      setRecreoBreakDisplay(responseBody);
    } catch {
      // Contador opcional
    }
  }, []);

  async function handleOpenCashSessionSubmit(): Promise<void> {
    const parsedOpening = Number.parseFloat(
      openingBalanceInitialInput.replace(",", "."),
    );
    if (!Number.isFinite(parsedOpening) || parsedOpening < 0) {
      setOpenCashErrorMessage("Indique un saldo inicial válido (≥ 0)");
      return;
    }
    setIsOpeningCashSession(true);
    setOpenCashErrorMessage("");
    try {
      const response = await fetch("/api/sales-sessions/open-cash", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: parsedOpening }),
      });
      const responseBody = (await response.json()) as { message?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setOpenCashErrorMessage(
          responseBody.message || "No se pudo abrir la caja",
        );
        return;
      }
      await loadOperatorCashSessionStatus();
    } catch {
      setOpenCashErrorMessage("Error al abrir la caja");
    } finally {
      setIsOpeningCashSession(false);
    }
  }

  function openStockAdjustmentModal(product: Product): void {
    setStockAdjustmentProduct(product);
    setStockAdjustmentNewStockInput(String(product.currentStock));
    setStockAdjustmentReasonInput("");
    setStockAdjustmentErrorMessage("");
  }

  function closeStockAdjustmentModal(): void {
    setStockAdjustmentProduct(null);
    setStockAdjustmentNewStockInput("");
    setStockAdjustmentReasonInput("");
    setStockAdjustmentErrorMessage("");
    setIsSavingStockAdjustment(false);
  }

  async function handleStockAdjustmentSubmit(): Promise<void> {
    if (stockAdjustmentProduct === null) {
      return;
    }

    const parsedNewStock = Number.parseInt(stockAdjustmentNewStockInput, 10);
    if (!Number.isFinite(parsedNewStock) || parsedNewStock < 0) {
      setStockAdjustmentErrorMessage("Cantidad de stock inválida");
      return;
    }

    const currentStockValue = stockAdjustmentProduct.currentStock;
    const isStockReduction = parsedNewStock < currentStockValue;
    const trimmedAdjustmentReason = stockAdjustmentReasonInput.trim();

    if (isStockReduction && trimmedAdjustmentReason.length === 0) {
      setStockAdjustmentErrorMessage("Indique el motivo del ajuste");
      return;
    }

    setIsSavingStockAdjustment(true);
    setStockAdjustmentErrorMessage("");

    try {
      const response = await fetch("/api/products/stock-adjustment", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIdentifier: stockAdjustmentProduct.id,
          newStock: parsedNewStock,
          adjustmentReason:
            trimmedAdjustmentReason.length > 0 ? trimmedAdjustmentReason : null,
        }),
      });

      const responseBody = (await response.json()) as { message?: string };

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setStockAdjustmentErrorMessage(
          responseBody.message || "No se pudo actualizar el stock",
        );
        return;
      }

      closeStockAdjustmentModal();
      await loadProductsCatalog();
    } catch {
      setStockAdjustmentErrorMessage("Error inesperado al guardar el stock");
    } finally {
      setIsSavingStockAdjustment(false);
    }
  }

  function openCreateProductModal(): void {
    setIsCreateProductModalOpen(true);
  }

  async function openCloseCashModal(): Promise<void> {
    setIsCloseCashModalOpen(true);
    setCloseCashErrorMessage("");
    setShiftClosingNotesInput("");
    setCashSummaryPayload(null);
    setPhysicalCashInput("");
    setIsLoadingCashSummary(true);
    try {
      const response = await fetch("/api/sales-sessions/cash-summary", {
        method: "GET",
        credentials: "include",
      });
      const responseBody = (await response.json()) as {
        cashSummary?: {
          sessionIdentifier: string;
          sessionType: string;
          openingBalance: number;
          expensesTotal: number;
          cashSalesTotal: number;
          expectedCashBalance: number;
        } | null;
        message?: string;
      };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setCloseCashErrorMessage(
          responseBody.message || "No se pudo cargar el resumen de caja",
        );
        return;
      }
      if (responseBody.cashSummary !== undefined && responseBody.cashSummary !== null) {
        setCashSummaryPayload(responseBody.cashSummary);
        setOpeningBalanceCashInput(
          String(responseBody.cashSummary.openingBalance),
        );
        setExpensesCashInput(String(responseBody.cashSummary.expensesTotal));
      }
    } catch {
      setCloseCashErrorMessage("No se pudo cargar el resumen de caja");
    } finally {
      setIsLoadingCashSummary(false);
    }
  }

  function closeCloseCashModal(): void {
    setIsCloseCashModalOpen(false);
    setCashSummaryPayload(null);
    setPhysicalCashInput("");
    setOpeningBalanceCashInput("");
    setExpensesCashInput("");
    setShiftClosingNotesInput("");
    setCloseCashErrorMessage("");
    setIsSubmittingCloseCash(false);
  }

  async function handleSubmitCloseCash(): Promise<void> {
    const physicalParsed = Number.parseFloat(
      physicalCashInput.replace(",", "."),
    );
    if (!Number.isFinite(physicalParsed) || physicalParsed < 0) {
      setCloseCashErrorMessage("Indique el efectivo real contado (≥ 0)");
      return;
    }
    const openingParsed = Number.parseFloat(
      openingBalanceCashInput.replace(",", "."),
    );
    const expensesParsed = Number.parseFloat(
      expensesCashInput.replace(",", "."),
    );
    if (!Number.isFinite(openingParsed) || openingParsed < 0) {
      setCloseCashErrorMessage("Saldo inicial inválido");
      return;
    }
    if (!Number.isFinite(expensesParsed) || expensesParsed < 0) {
      setCloseCashErrorMessage("Gastos inválidos");
      return;
    }

    setIsSubmittingCloseCash(true);
    setCloseCashErrorMessage("");

    try {
      const response = await fetch("/api/sales-sessions/close-cash", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          physicalCash: physicalParsed,
          openingBalance: openingParsed,
          expensesTotal: expensesParsed,
          shiftClosingNotes:
            shiftClosingNotesInput.trim().length > 0
              ? shiftClosingNotesInput.trim()
              : null,
        }),
      });
      const responseBody = (await response.json()) as { message?: string };

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setCloseCashErrorMessage(
          responseBody.message || "No se pudo cerrar la caja",
        );
        return;
      }

      closeCloseCashModal();
      await loadOperatorCashSessionStatus();
      await loadRecentSalesHistory();
    } catch {
      setCloseCashErrorMessage("Error al cerrar la caja");
    } finally {
      setIsSubmittingCloseCash(false);
    }
  }

  useEffect(() => {
    if (!isSaleModalOpen) {
      setSaleModalBackdropVisible(false);
      return;
    }
    setSaleModalBackdropVisible(false);
    const enterFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setSaleModalBackdropVisible(true);
        scannerInputReference.current?.focus();
      });
    });
    return () => window.cancelAnimationFrame(enterFrame);
  }, [isSaleModalOpen]);

  useEffect(() => {
    if (!isSaleModalOpen) {
      return;
    }
    ensureScannerFocus();
    const focusInterval = window.setInterval(ensureScannerFocus, 800);
    return () => {
      window.clearInterval(focusInterval);
    };
  }, [isSaleModalOpen]);

  useEffect(() => {
    const previousLength = previousSaleItemsListLengthReference.current;
    const currentLength = saleItemsList.length;

    if (isSaleModalOpen || isQuickLoadModalOpen) {
      if (currentLength < previousLength) {
        const nextTotalPages = Math.max(
          1,
          Math.ceil(currentLength / CART_PAGE_SIZE),
        );
        setCartPageIndex((previousPageIndex) =>
          Math.min(previousPageIndex, nextTotalPages - 1),
        );
      } else if (currentLength > previousLength && currentLength > 0) {
        setCartPageIndex(
          Math.floor((currentLength - 1) / CART_PAGE_SIZE),
        );
      }
    }

    previousSaleItemsListLengthReference.current = currentLength;
  }, [isQuickLoadModalOpen, isSaleModalOpen, saleItemsList.length]);

  useEffect(() => {
    if (!isQuickLoadModalOpen) {
      setQuickLoadModalBackdropVisible(false);
      return;
    }
    setQuickLoadModalBackdropVisible(false);
    const enterFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setQuickLoadModalBackdropVisible(true);
      });
    });
    return () => window.cancelAnimationFrame(enterFrame);
  }, [isQuickLoadModalOpen]);

  useEffect(() => {
    const storedBreakEndTime = localStorage.getItem(BREAK_END_TIME_STORAGE_KEY);
    if (!storedBreakEndTime) {
      return;
    }

    const breakEndTimeTimestamp = Number.parseInt(storedBreakEndTime, 10);
    if (!Number.isFinite(breakEndTimeTimestamp)) {
      localStorage.removeItem(BREAK_END_TIME_STORAGE_KEY);
      return;
    }

    const currentTimeTimestamp = Date.now();
    const remainingMilliseconds = breakEndTimeTimestamp - currentTimeTimestamp;

    if (remainingMilliseconds <= 0) {
      localStorage.removeItem(BREAK_END_TIME_STORAGE_KEY);
      return;
    }

    setRemainingTimeSeconds(Math.ceil(remainingMilliseconds / 1000));
    setIsBreakActive(true);
  }, []);

  useEffect(() => {
    void loadOperatorCashSessionStatus();
  }, [loadOperatorCashSessionStatus]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("tools") === "stock") {
      setIsStockToolsModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (operatorCashSessionState !== "hasSession") {
      return;
    }
    void loadProductsCatalog();
    void loadRecentSalesHistory();
    void loadRecreoBreakDisplay();
  }, [
    operatorCashSessionState,
    loadProductsCatalog,
    loadRecentSalesHistory,
    loadRecreoBreakDisplay,
  ]);

  useEffect(() => {
    if (operatorCashSessionState !== "hasSession") {
      return;
    }

    let supabaseClient: ReturnType<typeof createSupabaseBrowserClient> | null =
      null;
    try {
      supabaseClient = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const realtimeChannel = supabaseClient
      .channel("operador-products-sales")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => void loadProductsCatalog(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sales" },
        () => void loadRecentSalesHistory(),
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(realtimeChannel);
    };
  }, [operatorCashSessionState, loadProductsCatalog, loadRecentSalesHistory]);

  useEffect(() => {
    if (!isBreakActive) {
      return;
    }

    const intervalIdentifier = window.setInterval(() => {
      setRemainingTimeSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          window.clearInterval(intervalIdentifier);
          setIsBreakActive(false);
          localStorage.removeItem(BREAK_END_TIME_STORAGE_KEY);
          return 0;
        }
        return previousSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalIdentifier);
    };
  }, [isBreakActive]);

  const showScanFeedback = (message: string): void => {
    setScanFeedbackMessage(message);
    window.setTimeout(() => {
      setScanFeedbackMessage("");
    }, FEEDBACK_DISPLAY_TIME_MILLISECONDS);
  };

  const addProductToSaleItemsList = (product: Product): void => {
    setSaleItemsList((previousSaleItemsList) => {
      const existingSaleItem = previousSaleItemsList.find(
        (saleItem) => saleItem.productIdentifier === product.id,
      );

      const currentQuantityInCart = existingSaleItem?.quantity ?? 0;
      if (currentQuantityInCart + 1 > product.currentStock) {
        setErrorMessage("Stock insuficiente para el producto escaneado");
        return previousSaleItemsList;
      }

      if (existingSaleItem) {
        return previousSaleItemsList.map((saleItem) =>
          saleItem.productIdentifier === product.id
            ? { ...saleItem, quantity: saleItem.quantity + 1 }
            : saleItem,
        );
      }

      return [
        ...previousSaleItemsList,
        {
          productIdentifier: product.id,
          sku: product.sku,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          costPrice: product.costPrice,
          useCostPrice: false,
        },
      ];
    });
  };

  function addProductFromQuickLoadWithLineSubtotal(
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ): void {
    if (!Number.isFinite(lineSubtotal) || lineSubtotal <= 0) {
      setErrorMessage("Subtotal inválido");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setErrorMessage("Cantidad inválida");
      return;
    }
    if (quantity > product.currentStock) {
      setErrorMessage("Stock insuficiente para la cantidad seleccionada");
      return;
    }
    const nextUnitPrice = lineSubtotal / quantity;
    setSaleItemsList((previousSaleItemsList) => {
      const existingSaleItem = previousSaleItemsList.find(
        (saleItem) => saleItem.productIdentifier === product.id,
      );
      if (existingSaleItem) {
        return previousSaleItemsList.map((saleItem) =>
          saleItem.productIdentifier === product.id
            ? {
                ...saleItem,
                quantity,
                unitPrice: nextUnitPrice,
                costPrice: product.costPrice,
                useCostPrice: false,
              }
            : saleItem,
        );
      }
      return [
        ...previousSaleItemsList,
        {
          productIdentifier: product.id,
          sku: product.sku,
          name: product.name,
          quantity,
          unitPrice: nextUnitPrice,
          costPrice: product.costPrice,
          useCostPrice: false,
        },
      ];
    });
    setErrorMessage("");
    showScanFeedback(`Añadido: ${product.name}`);
  }

  function tryAddProductBySku(rawSku: string): void {
    setErrorMessage("");
    const normalizedScannedBarcode = rawSku.trim();
    if (normalizedScannedBarcode.length === 0) {
      return;
    }

    const product = productsCatalog.find(
      (catalogProduct) => catalogProduct.sku === normalizedScannedBarcode,
    );

    if (!product) {
      setErrorMessage("Producto no encontrado para código de barras escaneado");
      setScannedBarcode("");
      return;
    }

    addProductToSaleItemsList(product);
    showScanFeedback(`Añadido: ${product.name}`);
  }

  const handleScannerSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    tryAddProductBySku(scannedBarcode);
    setScannedBarcode("");
  };

  const removeSaleItem = (productIdentifier: string): void => {
    setSaleItemsList((previousSaleItemsList) =>
      previousSaleItemsList.filter(
        (saleItem) => saleItem.productIdentifier !== productIdentifier,
      ),
    );
  };

  const updateSaleItemQuantity = (
    productIdentifier: string,
    quantity: number,
  ): void => {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return;
    }

    setSaleItemsList((previousSaleItemsList) => {
      const catalogProduct = productsCatalog.find(
        (product) => product.id === productIdentifier,
      );

      if (!catalogProduct || quantity > catalogProduct.currentStock) {
        setErrorMessage("Stock insuficiente para la cantidad seleccionada");
        return previousSaleItemsList;
      }

      return previousSaleItemsList.map((saleItem) =>
        saleItem.productIdentifier === productIdentifier
          ? { ...saleItem, quantity }
          : saleItem,
      );
    });
  };

  function toggleSaleItemUseCostPrice(productIdentifier: string): void {
    setSaleItemsList((previousSaleItemsList) =>
      previousSaleItemsList.map((saleItem) => {
        if (saleItem.productIdentifier !== productIdentifier) {
          return saleItem;
        }
        const nextUseCostPrice = !saleItem.useCostPrice;
        const nextUnitPrice =
          nextUseCostPrice && saleItem.costPrice !== null
            ? saleItem.costPrice
            : productsCatalog.find((product) => product.id === productIdentifier)
                ?.price ?? saleItem.unitPrice;
        return {
          ...saleItem,
          useCostPrice: nextUseCostPrice,
          unitPrice: nextUnitPrice,
        };
      }),
    );
  }

  async function handleStartBreak(): Promise<void> {
    if (!Number.isInteger(breakDurationMinutes) || breakDurationMinutes <= 0) {
      setRecreoStartErrorMessage(
        "La duración del descanso debe ser mayor que cero.",
      );
      return;
    }
    setRecreoStartErrorMessage("");
    setIsStartingRecreoSession(true);
    try {
      const response = await fetch("/api/sales-sessions/start-recreo", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const responseBody = (await response.json()) as { message?: string };
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!response.ok) {
        setRecreoStartErrorMessage(
          responseBody.message ||
            "No se pudo registrar la sesión de recreo en el servidor.",
        );
        return;
      }
    } catch {
      setRecreoStartErrorMessage("No se pudo registrar la sesión de recreo.");
      return;
    } finally {
      setIsStartingRecreoSession(false);
    }

    void loadRecreoBreakDisplay();

    const breakEndTimeTimestamp = Date.now() + breakDurationMinutes * 60 * 1000;
    localStorage.setItem(BREAK_END_TIME_STORAGE_KEY, String(breakEndTimeTimestamp));
    setRemainingTimeSeconds(breakDurationMinutes * 60);
    setIsBreakActive(true);
  }

  function handleCancelBreak(): void {
    setIsBreakActive(false);
    setRemainingTimeSeconds(0);
    localStorage.removeItem(BREAK_END_TIME_STORAGE_KEY);
  }

  const handleFinalizeSale = async (): Promise<void> => {
    if (saleItemsList.length === 0) {
      setErrorMessage("Añade al menos un artículo para finalizar la venta.");
      setIsSessionMissingError(false);
      return;
    }

    setIsSubmittingSale(true);
    setErrorMessage("");
    setIsSessionMissingError(false);

    const automaticSaleCategory = isBreakActive ? "RECREO" : "VENTA_LIBRE";

    const paymentMethod = mapSelectedPaymentMethodToApiPaymentMethod();
    const sessionType = automaticSaleCategory;
    const saleItems = saleItemsList.map((saleItem) => ({
      productId: saleItem.productIdentifier,
      quantity: saleItem.quantity,
    }));
    const payload = {
      paymentMethod,
      automaticSaleCategory: sessionType,
      notes: saleNotesInput.trim().length > 0 ? saleNotesInput.trim() : null,
      saleItemsList: saleItems,
    };
    console.log("Final Payload to API:", JSON.stringify(payload));

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseBody = (await response.json()) as SalesApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        const resolvedMessage =
          responseBody.message || "No se puede procesar la venta";
        const hasMissingSessionError =
          isMissingOpenSessionSaleMessage(resolvedMessage);
        setIsSessionMissingError(hasMissingSessionError);
        setErrorMessage(
          hasMissingSessionError
            ? MISSING_OPEN_SESSION_UI_MESSAGE
            : resolvedMessage,
        );
        return;
      }

      setSaleItemsList([]);
      setSaleNotesInput("");
      showScanFeedback("Venta procesada correctamente");
      await loadRecentSalesHistory();
      await loadProductsCatalog();
    } catch {
      setErrorMessage("No se puede procesar la venta");
      setIsSessionMissingError(false);
    } finally {
      setIsSubmittingSale(false);
      ensureScannerFocus();
    }
  };

  function handleGoToOpenSessionFlow(): void {
    closeSaleModal();
    setOperatorCashSessionState("noSession");
    void loadOperatorCashSessionStatus();
  }

  function openLowStockAllModal(): void {
    setLowStockModalPageIndex(0);
    setIsLowStockAllModalOpen(true);
  }

  function closeSaleModal(): void {
    setSaleModalBackdropVisible(false);
    window.setTimeout(() => {
      setIsSaleModalOpen(false);
    }, 280);
  }

  function closeQuickLoadModal(): void {
    setQuickLoadModalBackdropVisible(false);
    setSaleNotesInput("");
    window.setTimeout(() => {
      setIsQuickLoadModalOpen(false);
    }, 280);
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-zinc-950">
      {operatorCashSessionState === "loading" ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cargando sesión…
          </p>
        </div>
      ) : operatorCashSessionState === "noSession" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/85 p-8 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-amber-100/80 p-4 dark:bg-amber-950/50">
                <Banknote
                  className="size-12 text-amber-800 dark:text-amber-200"
                  aria-hidden
                />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Abrir caja
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Ingrese el efectivo inicial del turno para comenzar a operar.
              </p>
              <label className="mt-6 w-full text-left">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Saldo inicial (efectivo)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={openingBalanceInitialInput}
                  onChange={(event) =>
                    setOpeningBalanceInitialInput(event.target.value)
                  }
                  placeholder="0,00"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base outline-none ring-amber-500/20 transition focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              {openCashErrorMessage.length > 0 ? (
                <p
                  className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                  role="alert"
                >
                  {openCashErrorMessage}
                </p>
              ) : null}
              <button
                type="button"
                disabled={isOpeningCashSession}
                onClick={() => void handleOpenCashSessionSubmit()}
                className="mt-6 w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isOpeningCashSession ? "Abriendo…" : "Abrir caja"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-zinc-900">
              <ShoppingCart className="size-6 text-zinc-700 dark:text-zinc-200" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 md:text-2xl">
                Punto de venta
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">
                Turno activo — sin desplazamiento de página
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStockToolsModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              <Warehouse className="size-4 shrink-0" aria-hidden />
              Crear o Ajustar stock
            </button>
            <button
              type="button"
              onClick={() => void openCloseCashModal()}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
            >
              <Banknote className="size-4 shrink-0" aria-hidden />
              Cerrar caja
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <div className="flex min-h-[220px] flex-col rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Clock
                className="size-12 shrink-0 text-zinc-700 dark:text-zinc-200"
                aria-hidden
              />
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Turno y recreo
              </h3>
              {recreoBreakDisplay !== null ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Recreos hoy (colegio):{" "}
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {recreoBreakDisplay.recreoSessionsStartedTodayCount} /{" "}
                    {recreoBreakDisplay.maxBreaksPerDay}
                  </span>
                </p>
              ) : null}
              {recreoStartErrorMessage.length > 0 ? (
                <p className="max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {recreoStartErrorMessage}
                </p>
              ) : null}
              <div className="flex w-full max-w-xs flex-col items-center gap-4">
                <div className="flex flex-wrap items-end justify-center gap-3">
                  <label className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Duración (min)
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={breakDurationMinutes}
                      onChange={(event) =>
                        setBreakDurationMinutes(
                          Number.parseInt(event.target.value || "0", 10),
                        )
                      }
                      className="w-36 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-center text-sm outline-none ring-zinc-900/10 transition focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:focus:ring-zinc-100"
                    />
                  </label>
                  {!isBreakActive && remainingTimeSeconds === 0 ? (
                    <button
                      type="button"
                      disabled={isStartingRecreoSession}
                      onClick={() => void handleStartBreak()}
                      className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {isStartingRecreoSession ? "Registrando…" : "Iniciar recreo"}
                    </button>
                  ) : null}
                </div>
                {isBreakActive || remainingTimeSeconds > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      Termina en: {formatRemainingTime(remainingTimeSeconds)}
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelBreak}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuickLoadModalOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <LayoutGrid
              className="size-14 shrink-0 text-amber-600"
              aria-hidden
            />
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Carga rápida
            </span>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Catálogo visual por categoría con imágenes
            </p>
          </button>

          <button
            type="button"
            onClick={() => setIsSaleModalOpen(true)}
            className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <ShoppingCart
              className="size-14 shrink-0 text-emerald-600"
              aria-hidden
            />
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Cargar venta
            </span>
            <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
              Escanear, carrito, pago e historial
            </p>
          </button>
        </div>

        {lowStockProductsList.length > 0 ? (
          <div className="min-w-0 rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-900 dark:bg-amber-950">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-800 dark:text-amber-200" />
                <h3 className="text-base font-semibold text-amber-950 dark:text-amber-100">
                  Alertas de stock bajo
                </h3>
              </div>
              {lowStockProductsList.length > LOW_STOCK_PREVIEW_COUNT ? (
                <button
                  type="button"
                  onClick={openLowStockAllModal}
                  className="rounded-lg border border-amber-700 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-900/80"
                >
                  Ver todos
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lowStockPreviewList.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
                >
                  <p className="truncate text-sm font-semibold text-red-800 dark:text-red-200">
                    {product.name}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Stock: {product.currentStock}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        </div>
      )}

      {isSaleModalOpen ? (
        <div
          className={`${OPERATOR_GLASS_MODAL_BACKDROP} ${saleModalBackdropVisible ? "opacity-100" : "opacity-0"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-modal-title"
        >
          <div
            className={`${OPERATOR_GLASS_MODAL_PANEL} ${saleModalBackdropVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2
                id="sale-modal-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Cargar venta
              </h2>
              <button
                type="button"
                onClick={closeSaleModal}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              className={`grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:min-h-[min(70vh,560px)] ${
                isSaleHistoryPanelOpen
                  ? "lg:grid-cols-[22rem_1fr]"
                  : "lg:grid-cols-[22rem_1fr_auto]"
              }`}
            >
              {/* Columna 1: Scanner + Pago + acciones */}
              <div className="min-h-0 overflow-y-auto border-b border-zinc-200 p-4 dark:border-zinc-800 lg:border-b-0 lg:border-r">
                <section className="space-y-3">
                  <form onSubmit={handleScannerSubmit} className="space-y-2">
                    <label
                      htmlFor="scanned-barcode-input"
                      className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    >
                      <ScanLine className="size-4" />
                      Escanear código de barras
                    </label>
                    <input
                      ref={scannerInputReference}
                      id="scanned-barcode-input"
                      value={scannedBarcode}
                      onChange={(event) => setScannedBarcode(event.target.value)}
                      autoComplete="off"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base outline-none ring-emerald-500/20 transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="Escanea y presiona Enter"
                    />
                    <button
                      type="button"
                      onClick={() => setIsBarcodeCameraScannerOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      <Camera className="size-4" aria-hidden />
                      Abrir cámara
                    </button>
                  </form>

                  {scanFeedbackMessage.length > 0 ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      <CheckCircle2 className="size-4" />
                      {scanFeedbackMessage}
                    </div>
                  ) : null}
                  {errorMessage.length > 0 ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                      <p>{isSessionMissingError ? `⚠️ ${errorMessage}` : errorMessage}</p>
                      {isSessionMissingError ? (
                        <button
                          type="button"
                          onClick={handleGoToOpenSessionFlow}
                          className="mt-2 inline-flex items-center rounded-md border border-red-300 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-white dark:border-red-700 dark:bg-zinc-900/60 dark:text-red-200 dark:hover:bg-zinc-900"
                        >
                          Ir a Abrir caja
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className="mt-6">
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Método de pago
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHOD_OPTIONS.map((method) => {
                      const MethodIcon = method.icon;
                      return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method.value)}
                        aria-label={method.label}
                        title={method.label}
                        className={
                          selectedPaymentMethod === method.value
                            ? "inline-flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-emerald-600 bg-emerald-600 px-2 py-2 text-white"
                            : "inline-flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        }
                      >
                        <MethodIcon className="size-5" aria-hidden />
                        <span className="text-xs font-semibold leading-none">
                          {method.label}
                        </span>
                      </button>
                    );
                    })}
                  </div>
                </section>

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={closeSaleModal}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleFinalizeSale()}
                    disabled={isSubmittingSale || saleItemsList.length === 0}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <ShoppingCart className="size-4" aria-hidden />
                    {isSubmittingSale ? "Procesando…" : "Cobrar"}
                  </button>
                </div>
              </div>

              {/* Columna 2: Carrito paginado */}
              {!isSaleHistoryPanelOpen ? (
              <div className="min-h-0 overflow-y-auto p-4">
                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      Carrito
                    </h3>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Total:{" "}
                      <span className="font-semibold tabular-nums">
                        {formatArgentinaPesos(totalSaleAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="max-h-[60vh] overflow-auto">
                      <table className="w-full min-w-[520px] text-left text-sm">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/90">
                          <tr>
                            <th className="px-3 py-2">Producto</th>
                            <th className="px-3 py-2">Cantidad</th>
                            <th className="px-3 py-2">Total</th>
                            <th className="px-3 py-2">Precio Costo</th>
                            <th className="px-3 py-2 text-right">—</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                          {isLoadingProductsCatalog ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                                Cargando…
                              </td>
                            </tr>
                          ) : saleItemsList.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                                Sin ítems.
                              </td>
                            </tr>
                          ) : (
                            pagedCartItems.map((saleItem) => (
                              <tr key={saleItem.productIdentifier}>
                                <td className="px-3 py-2">
                                  <div className="font-medium">{saleItem.name}</div>
                                  <div className="text-xs text-zinc-500">
                                    {saleItem.sku || "—"}
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          Math.max(1, saleItem.quantity - 1),
                                        )
                                      }
                                      className="inline-flex size-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600"
                                    >
                                      <Minus className="size-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      value={saleItem.quantity}
                                      onChange={(event) =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          Number.parseInt(event.target.value || "1", 10),
                                        )
                                      }
                                      className="w-14 rounded border border-zinc-300 px-1 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          saleItem.quantity + 1,
                                        )
                                      }
                                      className="inline-flex size-7 items-center justify-center rounded border border-zinc-300 dark:border-zinc-600"
                                    >
                                      <Plus className="size-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2 tabular-nums">
                                  {formatArgentinaPesos(
                                    saleItem.quantity * saleItem.unitPrice,
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <label className="inline-flex items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={saleItem.useCostPrice}
                                      disabled={saleItem.costPrice === null}
                                      onChange={() =>
                                        toggleSaleItemUseCostPrice(
                                          saleItem.productIdentifier,
                                        )
                                      }
                                    />
                                    Precio Costo
                                  </label>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSaleItem(saleItem.productIdentifier)
                                    }
                                    className="inline-flex size-8 items-center justify-center rounded border text-red-600"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Página {Math.min(cartPageIndex + 1, cartTotalPages)} / {cartTotalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={cartPageIndex <= 0}
                        onClick={() => setCartPageIndex((previous) => Math.max(0, previous - 1))}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={cartPageIndex >= cartTotalPages - 1}
                        onClick={() =>
                          setCartPageIndex((previous) =>
                            Math.min(cartTotalPages - 1, previous + 1),
                          )
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </section>
              </div>
              ) : null}

              {/* Columna 3: Sidebar colapsable */}
              <div className={isSaleHistoryPanelOpen ? "border-l border-zinc-200 dark:border-zinc-800" : ""}>
                <div className={isSaleHistoryPanelOpen ? "flex h-full w-full flex-col overflow-hidden bg-white dark:bg-zinc-900" : "flex h-full w-12 flex-col"}>
                  {!isSaleHistoryPanelOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsSaleHistoryPanelOpen(true)}
                      className="flex h-full w-12 items-center justify-center border-l border-zinc-200 bg-white/80 text-zinc-700 backdrop-blur hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-200"
                      aria-label="Abrir historial"
                    >
                      <span
                        className="text-xs font-semibold uppercase tracking-[0.25em]"
                        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                      >
                        H i s t o r i a l
                      </span>
                    </button>
                  ) : (
                    <>
                      <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Historial
                          </h3>
                          <button
                            type="button"
                            onClick={() => setIsSaleHistoryPanelOpen(false)}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          >
                            Cerrar Historial
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSaleHistoryTab("ventaLibre")}
                            className={
                              saleHistoryTab === "ventaLibre"
                                ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            }
                          >
                            Venta libre
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleHistoryTab("recreo")}
                            className={
                              saleHistoryTab === "recreo"
                                ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            }
                          >
                            Recreo
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleHistoryTab("ventaTotal")}
                            className={
                              saleHistoryTab === "ventaTotal"
                                ? "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                : "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                            }
                          >
                            Venta total
                          </button>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-auto p-4">
                        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/90">
                              <tr>
                                <th className="px-2 py-2 font-medium">Productos</th>
                                <th className="px-2 py-2 font-medium">Total</th>
                                <th className="px-2 py-2 font-medium">Pago</th>
                                <th className="px-2 py-2 font-medium">Fecha</th>
                                <th className="px-2 py-2 font-medium">Usuario</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                              {recentSalesForActiveHistoryTab.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-3 py-10 text-center text-zinc-500">
                                    <p className="font-medium text-zinc-600 dark:text-zinc-400">
                                      Sin ventas
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      {saleHistoryTab === "ventaLibre"
                                        ? "No hay ventas de venta libre."
                                        : saleHistoryTab === "recreo"
                                          ? "No hay ventas del recreo activo."
                                          : "No hay ventas registradas para hoy."}
                                    </p>
                                  </td>
                                </tr>
                              ) : (
                                recentSalesForActiveHistoryTab.map((record, index) => (
                                  <tr key={`${record.saleIdentifier}-${index}`}>
                                    <td className="max-w-[200px] px-2 py-2 text-xs">
                                      {record.productNamesSummary}
                                    </td>
                                    <td className="px-2 py-2 tabular-nums">
                                      {formatArgentinaPesos(record.totalAmount)}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                      {formatPaymentMethodLabel(record.paymentMethod)}
                                    </td>
                                    <td className="whitespace-nowrap px-2 py-2 text-xs">
                                      {formatArgentinaSaleDate(record.createdAt)}
                                    </td>
                                    <td className="px-2 py-2 text-xs">
                                      <div className="font-medium">{record.sellerFullName}</div>
                                      <div className="text-zinc-500">{record.sellerRole}</div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isQuickLoadModalOpen ? (
        <div
          className={`${OPERATOR_GLASS_MODAL_BACKDROP} ${quickLoadModalBackdropVisible ? "opacity-100" : "opacity-0"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-load-title"
        >
          <div
            className={`flex max-h-[min(100dvh,100vh)] w-full max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-2xl ring-1 ring-black/5 transition-all duration-300 ease-out dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10 md:max-h-[min(92vh,920px)] md:max-w-7xl ${quickLoadModalBackdropVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"}`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 px-6 py-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Package className="size-6" aria-hidden />
                </div>
                <div>
                  <h2
                    id="quick-load-title"
                    className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100"
                  >
                    Carga rápida
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Catálogo y cobro en un solo lugar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeQuickLoadModal}
                className="rounded-2xl p-2.5 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-10 overflow-hidden p-8 lg:grid-cols-12">
              <div className="min-h-0 overflow-y-auto rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-7 py-7 shadow-lg dark:border-zinc-800 lg:col-span-4">
                <div className="mb-6 space-y-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setCatalogBrowseMode("categories")}
                      className={
                        catalogBrowseMode === "categories"
                          ? "rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25"
                          : "rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      }
                    >
                      Categorías
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatalogBrowseMode("search")}
                      className={
                        catalogBrowseMode === "search"
                          ? "rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/25"
                          : "rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      }
                    >
                      Buscar nombre
                    </button>
                  </div>
                  {catalogBrowseMode === "categories" ? (
                    <div className="flex flex-wrap gap-4">
                      <button
                        type="button"
                        onClick={() => setQuickLoadSelectedCategory("ALL")}
                        className={
                          quickLoadSelectedCategory === "ALL"
                            ? "rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900"
                            : "rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }
                      >
                        Todas
                      </button>
                      {catalogUniqueCategoryList.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setQuickLoadSelectedCategory(category)}
                          className={
                            quickLoadSelectedCategory === category
                              ? "rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-amber-500/30"
                              : "rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                          }
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="search"
                      value={quickLoadSearchQuery}
                      onChange={(event) => setQuickLoadSearchQuery(event.target.value)}
                      placeholder="Buscar por nombre…"
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm shadow-sm outline-none ring-emerald-500/20 transition focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  )}
                </div>
                {quickLoadDisplayedProducts.length === 0 ? (
                  <p className="rounded-2xl bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm dark:bg-zinc-900/80">
                    {isLoadingProductsCatalog
                      ? "Cargando catálogo…"
                      : catalogBrowseMode === "search" &&
                          quickLoadSearchQuery.trim().length === 0
                        ? "Escribe para buscar productos por nombre."
                        : "No hay productos en esta vista."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {quickLoadDisplayedProducts.map((product) => {
                      return (
                        <div
                          key={product.id}
                          className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800/60">
                                <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-inner dark:bg-zinc-900/50">
                                  <Camera
                                    className="size-7 text-zinc-400"
                                    aria-hidden
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
                            <p className="line-clamp-2 text-sm font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                              {product.name}
                            </p>
                            {product.isBulk ? (
                              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                Venta por unidad
                              </p>
                            ) : null}
                            <p className="text-base font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                              {formatArgentinaPesos(product.price)}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                addProductFromQuickLoadWithLineSubtotal(
                                  product,
                                  1,
                                  product.price,
                                );
                              }}
                              className="mt-auto w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
                            >
                              Añadir al carrito
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex h-full min-h-[600px] flex-col rounded-2xl border border-zinc-200/80 bg-white px-7 py-7 shadow-lg dark:border-zinc-800 dark:bg-zinc-950/40 lg:col-span-8">
                <section className="min-h-[300px]">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Carrito en vivo
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Ajustá cantidades y confirmá el cobro
                      </p>
                    </div>
                  </div>

                  <div className="min-h-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center justify-end border-b border-zinc-200/80 bg-zinc-50/90 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
                      <div className="rounded-2xl bg-emerald-50 px-3 py-1 text-right dark:bg-emerald-950/40">
                        <span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                          Total
                        </span>
                        <span className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatArgentinaPesos(totalSaleAmount)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <table className="w-full min-w-[280px] border-separate border-spacing-0 text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-zinc-100/95 dark:bg-zinc-800/95">
                          <tr>
                            <th className="rounded-tl-2xl px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                              Producto
                            </th>
                            <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                              Cantidad
                            </th>
                            <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                              Total
                            </th>
                            <th className="px-4 py-4 font-semibold text-zinc-700 dark:text-zinc-200">
                              Precio costo
                            </th>
                            <th className="rounded-tr-2xl px-4 py-4 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                              —
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {saleItemsList.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-6 py-14 text-center text-sm text-zinc-500"
                              >
                                El carrito está vacío.
                              </td>
                            </tr>
                          ) : (
                            pagedCartItems.map((saleItem, rowIndex) => (
                              <tr
                                key={saleItem.productIdentifier}
                                className={rowIndex % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-zinc-50 dark:bg-zinc-800/50"}
                              >
                                <td className="max-w-[140px] px-4 py-3.5 align-middle">
                                  <div className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {saleItem.name}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          Math.max(1, saleItem.quantity - 1),
                                        )
                                      }
                                      className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                                    >
                                      <Minus className="size-4" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      value={saleItem.quantity}
                                      onChange={(event) =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          Number.parseInt(
                                            event.target.value || "1",
                                            10,
                                          ),
                                        )
                                      }
                                      className="w-12 rounded-xl border border-zinc-200 bg-white px-1 py-2 text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSaleItemQuantity(
                                          saleItem.productIdentifier,
                                          saleItem.quantity + 1,
                                        )
                                      }
                                      className="inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/80"
                                    >
                                      <Plus className="size-4" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 align-middle text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                                  {formatArgentinaPesos(
                                    saleItem.quantity * saleItem.unitPrice,
                                  )}
                                </td>
                                <td className="px-4 py-3.5 align-middle">
                                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                                    <input
                                      type="checkbox"
                                      checked={saleItem.useCostPrice}
                                      disabled={saleItem.costPrice === null}
                                      onChange={() =>
                                        toggleSaleItemUseCostPrice(
                                          saleItem.productIdentifier,
                                        )
                                      }
                                      className="size-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    Usar costo
                                  </label>
                                </td>
                                <td className="px-4 py-3.5 text-right align-middle">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSaleItem(saleItem.productIdentifier)
                                    }
                                    className="inline-flex size-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">
                      Página {Math.min(cartPageIndex + 1, cartTotalPages)} /{" "}
                      {cartTotalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={cartPageIndex <= 0}
                        onClick={() =>
                          setCartPageIndex((previous) =>
                            Math.max(0, previous - 1),
                          )
                        }
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        disabled={cartPageIndex >= cartTotalPages - 1}
                        onClick={() =>
                          setCartPageIndex((previous) =>
                            Math.min(cartTotalPages - 1, previous + 1),
                          )
                        }
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold shadow-sm disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-800"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </section>

                <section className="mt-auto min-h-0 border-t border-zinc-100 pt-8 dark:border-zinc-800">
                  <div className="grid min-h-0 grid-cols-1 gap-6 xl:grid-cols-12">
                    <div className="xl:col-span-7">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Método de pago
                      </h3>
                      <div className="mt-3 grid grid-cols-2 place-items-center gap-4">
                        {PAYMENT_METHOD_OPTIONS.map((method) => {
                          const MethodIcon = method.icon;
                          const isSelected = selectedPaymentMethod === method.value;
                          return (
                            <button
                              key={method.value}
                              type="button"
                              onClick={() => setSelectedPaymentMethod(method.value)}
                              aria-label={method.label}
                              title={method.label}
                              className={
                                isSelected
                                  ? "flex aspect-square w-full max-w-[136px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-emerald-600 p-4 text-white shadow-lg shadow-emerald-600/30 transition-transform scale-[1.02]"
                                  : "flex aspect-square w-full max-w-[136px] flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200/90 bg-zinc-100 p-4 text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                              }
                            >
                              <MethodIcon
                                className={
                                  isSelected ? "size-6 text-white" : "size-6 text-zinc-600 dark:text-zinc-300"
                                }
                                aria-hidden
                              />
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <Check className="size-4 text-white" strokeWidth={3} />
                                ) : null}
                                <span
                                  className={
                                    isSelected
                                      ? "text-center text-xs font-bold leading-tight"
                                      : "text-center text-xs font-bold leading-tight text-zinc-800 dark:text-zinc-100"
                                  }
                                >
                                  {method.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="min-h-0 xl:col-span-5">
                      <label
                        htmlFor="quick-load-sale-notes"
                        className="text-sm font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500"
                      >
                        Observaciones (opcional)
                      </label>
                      <textarea
                        id="quick-load-sale-notes"
                        value={saleNotesInput}
                        onChange={(event) => setSaleNotesInput(event.target.value)}
                        placeholder="Nota breve para el ticket o interna…"
                        className="mt-3 h-[176px] w-full resize-none rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-emerald-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={closeQuickLoadModal}
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleFinalizeSale()}
                      disabled={isSubmittingSale || saleItemsList.length === 0}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-xl shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingCart className="size-6" aria-hidden />
                      {isSubmittingSale ? "Procesando…" : "Cobrar"}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isStockToolsModalOpen ? (
        <div
          className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-tools-title"
        >
          <div className="w-full max-w-3xl rounded-2xl border border-white/25 bg-white/85 p-5 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="stock-tools-title" className="text-lg font-semibold">
                Crear o Ajustar stock
              </h2>
              <button
                type="button"
                onClick={() => setIsStockToolsModalOpen(false)}
                className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={openCreateProductModal}
                className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <p className="text-base font-semibold">Nuevo producto</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Alta rápida de producto para el operador.
                </p>
              </button>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="text-base font-semibold">Ajustar stock</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Seleccione un producto y ajuste cantidad con justificación.
                </p>
                {productsCatalog.length > 0 ? (
                  <label className="mt-4 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Producto para ajustar
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      onChange={(event) => {
                        const selected = productsCatalog.find(
                          (product) => product.id === event.target.value,
                        );
                        if (selected) {
                          openStockAdjustmentModal(selected);
                          setIsStockToolsModalOpen(false);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Elegir producto…
                      </option>
                      {productsCatalog.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.currentStock})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ProductFormModal
        isOpen={isCreateProductModalOpen}
        onClose={() => setIsCreateProductModalOpen(false)}
        mode="create"
        initialProduct={null}
        editingProductId={null}
        productList={productsCatalog}
        onSuccess={async () => {
          setIsStockToolsModalOpen(false);
          await loadProductsCatalog();
        }}
        overlayZClass="z-56"
      />

      {isCloseCashModalOpen ? (
        <div
          className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-cash-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2
                id="close-cash-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Cerrar caja (arqueo)
              </h2>
              <button
                type="button"
                onClick={closeCloseCashModal}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              {isLoadingCashSummary ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Cargando sesión abierta…
                </p>
              ) : cashSummaryPayload === null ? (
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  No hay sesión de venta abierta. Realice una venta o inicie
                  recreo para abrir una sesión.
                </p>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Sesión:{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {cashSummaryPayload.sessionType}
                    </span>
                  </p>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-zinc-700 dark:text-zinc-200">
                      Ventas en efectivo acumuladas:{" "}
                      <span className="font-semibold tabular-nums">
                        {formatArgentinaPesos(cashSummaryPayload.cashSalesTotal)}
                      </span>
                    </p>
                    <p className="mt-2 text-zinc-700 dark:text-zinc-200">
                      Efectivo esperado (preliminar):{" "}
                      <span className="font-semibold tabular-nums">
                        {formatArgentinaPesos(
                          cashSummaryPayload.expectedCashBalance,
                        )}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Fórmula: saldo inicial + ventas efectivo − gastos. Se
                      recalcula al guardar con los valores editados.
                    </p>
                  </div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Saldo inicial (efectivo de apertura)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={openingBalanceCashInput}
                      onChange={(event) =>
                        setOpeningBalanceCashInput(event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Gastos (efectivo)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={expensesCashInput}
                      onChange={(event) =>
                        setExpensesCashInput(event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Efectivo real contado (obligatorio)
                    <input
                      type="text"
                      inputMode="decimal"
                      value={physicalCashInput}
                      onChange={(event) =>
                        setPhysicalCashInput(event.target.value)
                      }
                      placeholder="0,00"
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Observaciones del turno (opcional)
                    <textarea
                      value={shiftClosingNotesInput}
                      onChange={(event) =>
                        setShiftClosingNotesInput(event.target.value)
                      }
                      rows={3}
                      maxLength={MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH}
                      placeholder="Incidencias, diferencias, comentarios del cierre…"
                      className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                  </label>
                </>
              )}
              {closeCashErrorMessage.length > 0 ? (
                <p className="text-sm text-red-600" role="alert">
                  {closeCashErrorMessage}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeCloseCashModal}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isSubmittingCloseCash ||
                  isLoadingCashSummary ||
                  cashSummaryPayload === null
                }
                onClick={() => void handleSubmitCloseCash()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingCloseCash ? "Cerrando…" : "Confirmar cierre"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stockAdjustmentProduct !== null ? (
        <div
          className="fixed inset-0 z-55 flex items-center justify-center bg-zinc-950/55 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-adjustment-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2
                id="stock-adjustment-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Ajustar stock
              </h2>
              <button
                type="button"
                onClick={closeStockAdjustmentModal}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Cerrar"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{stockAdjustmentProduct.name}</span>
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Stock actual:{" "}
                <span className="font-semibold tabular-nums">
                  {stockAdjustmentProduct.currentStock}
                </span>
              </p>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nuevo stock
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={stockAdjustmentNewStockInput}
                  onChange={(event) =>
                    setStockAdjustmentNewStockInput(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              {stockAdjustmentIsReduction ? (
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Motivo del ajuste (obligatorio)
                  <textarea
                    value={stockAdjustmentReasonInput}
                    onChange={(event) =>
                      setStockAdjustmentReasonInput(event.target.value)
                    }
                    rows={3}
                    placeholder="Ej.: mercadería dañada, conteo incorrecto…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                </label>
              ) : null}
              {stockAdjustmentErrorMessage.length > 0 ? (
                <p className="text-sm text-red-600" role="alert">
                  {stockAdjustmentErrorMessage}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <button
                type="button"
                onClick={closeStockAdjustmentModal}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!canSubmitStockAdjustment}
                onClick={() => void handleStockAdjustmentSubmit()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingStockAdjustment ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLowStockAllModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="low-stock-all-title"
        >
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform duration-200 ease-out dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2
                id="low-stock-all-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Stock bajo — listado completo
              </h2>
              <button
                type="button"
                onClick={() => setIsLowStockAllModalOpen(false)}
                className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-2">
                {lowStockModalSlice.map((product) => (
                  <li
                    key={product.id}
                    className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50"
                  >
                    <p className="font-medium text-red-900 dark:text-red-100">
                      {product.name}
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Stock: {product.currentStock}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <button
                type="button"
                disabled={lowStockModalPageIndex <= 0}
                onClick={() =>
                  setLowStockModalPageIndex((previous) =>
                    Math.max(0, previous - 1),
                  )
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-600"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-600">
                Página {lowStockModalPageIndex + 1} / {lowStockModalTotalPages}
              </span>
              <button
                type="button"
                disabled={
                  lowStockModalPageIndex >= lowStockModalTotalPages - 1
                }
                onClick={() =>
                  setLowStockModalPageIndex((previous) =>
                    Math.min(lowStockModalTotalPages - 1, previous + 1),
                  )
                }
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-600"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <BarcodeCameraScanner
        isOpen={isBarcodeCameraScannerOpen}
        onClose={() => setIsBarcodeCameraScannerOpen(false)}
        onDecoded={(decodedText) => {
          setScannedBarcode(decodedText);
          tryAddProductBySku(decodedText);
        }}
      />
    </main>
  );
};

export default OperadorDashboardPage;
