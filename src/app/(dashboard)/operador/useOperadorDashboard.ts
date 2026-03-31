"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { Product } from "@/types/database";
import { formatArgentinaPesos } from "@/lib/currencyFormat";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type {
  CartItem,
  CatalogBrowseMode,
  OperatorCashSessionState,
  ProductsApiResponse,
  RecentSalesHistoryApiResponse,
  RecentSaleHistoryRecord,
  SaleHistoryTab,
  SalesApiResponse,
  SelectedPaymentMethod,
} from "./types";
import {
  BREAK_END_TIME_STORAGE_KEY,
  CART_PAGE_SIZE,
  DEFAULT_BREAK_DURATION_MINUTES,
  FEEDBACK_DISPLAY_TIME_MILLISECONDS,
  LOW_STOCK_MODAL_PAGE_SIZE,
  LOW_STOCK_PREVIEW_COUNT,
  MAX_SHIFT_CLOSING_NOTES_INPUT_LENGTH,
  MISSING_OPEN_SESSION_UI_MESSAGE,
} from "./constants";
import { isMissingOpenSessionSaleMessage } from "./formatters";

export function useOperadorDashboard() {
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

  return {
    scannerInputReference,
    previousSaleItemsListLengthReference,
    scannedBarcode,
    setScannedBarcode,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    breakDurationMinutes,
    setBreakDurationMinutes,
    operatorCashSessionState,
    setOperatorCashSessionState,
    openingBalanceInitialInput,
    setOpeningBalanceInitialInput,
    openCashErrorMessage,
    setOpenCashErrorMessage,
    isOpeningCashSession,
    setIsOpeningCashSession,
    recreoBreakDisplay,
    setRecreoBreakDisplay,
    isStartingRecreoSession,
    setIsStartingRecreoSession,
    recreoStartErrorMessage,
    setRecreoStartErrorMessage,
    remainingTimeSeconds,
    setRemainingTimeSeconds,
    isBreakActive,
    setIsBreakActive,
    productsCatalog,
    setProductsCatalog,
    saleItemsList,
    setSaleItemsList,
    isLoadingProductsCatalog,
    setIsLoadingProductsCatalog,
    isSubmittingSale,
    setIsSubmittingSale,
    saleNotesInput,
    setSaleNotesInput,
    errorMessage,
    setErrorMessage,
    isSessionMissingError,
    setIsSessionMissingError,
    scanFeedbackMessage,
    setScanFeedbackMessage,
    recentSalesVentaLibre,
    setRecentSalesVentaLibre,
    recentSalesRecreo,
    setRecentSalesRecreo,
    recentSalesVentaTotal,
    setRecentSalesVentaTotal,
    saleHistoryTab,
    setSaleHistoryTab,
    isSaleModalOpen,
    setIsSaleModalOpen,
    saleModalBackdropVisible,
    setSaleModalBackdropVisible,
    isSaleHistoryPanelOpen,
    setIsSaleHistoryPanelOpen,
    cartPageIndex,
    setCartPageIndex,
    isQuickLoadModalOpen,
    setIsQuickLoadModalOpen,
    isBarcodeCameraScannerOpen,
    setIsBarcodeCameraScannerOpen,
    isStockToolsModalOpen,
    setIsStockToolsModalOpen,
    isCreateProductModalOpen,
    setIsCreateProductModalOpen,
    quickLoadModalBackdropVisible,
    setQuickLoadModalBackdropVisible,
    isLowStockAllModalOpen,
    setIsLowStockAllModalOpen,
    quickLoadSearchQuery,
    setQuickLoadSearchQuery,
    catalogBrowseMode,
    setCatalogBrowseMode,
    quickLoadSelectedCategory,
    setQuickLoadSelectedCategory,
    stockAdjustmentProduct,
    setStockAdjustmentProduct,
    stockAdjustmentNewStockInput,
    setStockAdjustmentNewStockInput,
    stockAdjustmentReasonInput,
    setStockAdjustmentReasonInput,
    isSavingStockAdjustment,
    setIsSavingStockAdjustment,
    stockAdjustmentErrorMessage,
    setStockAdjustmentErrorMessage,
    isCloseCashModalOpen,
    setIsCloseCashModalOpen,
    physicalCashInput,
    setPhysicalCashInput,
    openingBalanceCashInput,
    setOpeningBalanceCashInput,
    expensesCashInput,
    setExpensesCashInput,
    cashSummaryPayload,
    setCashSummaryPayload,
    isLoadingCashSummary,
    setIsLoadingCashSummary,
    closeCashErrorMessage,
    setCloseCashErrorMessage,
    isSubmittingCloseCash,
    setIsSubmittingCloseCash,
    shiftClosingNotesInput,
    setShiftClosingNotesInput,
    lowStockModalPageIndex,
    setLowStockModalPageIndex,
    totalSaleAmount,
    lowStockProductsList,
    cartTotalPages,
    pagedCartItems,
    lowStockPreviewList,
    lowStockModalTotalPages,
    lowStockModalSlice,
    catalogUniqueCategoryList,
    quickLoadDisplayedProducts,
    recentSalesForActiveHistoryTab,
    canSubmitStockAdjustment,
    stockAdjustmentIsReduction,
    loadProductsCatalog,
    loadRecentSalesHistory,
    loadOperatorCashSessionStatus,
    loadRecreoBreakDisplay,
    handleOpenCashSessionSubmit,
    openStockAdjustmentModal,
    closeStockAdjustmentModal,
    handleStockAdjustmentSubmit,
    openCreateProductModal,
    openCloseCashModal,
    closeCloseCashModal,
    handleSubmitCloseCash,
    showScanFeedback,
    addProductFromQuickLoadWithLineSubtotal,
    tryAddProductBySku,
    handleScannerSubmit,
    removeSaleItem,
    updateSaleItemQuantity,
    toggleSaleItemUseCostPrice,
    handleStartBreak,
    handleCancelBreak,
    handleFinalizeSale,
    handleGoToOpenSessionFlow,
    openLowStockAllModal,
    closeSaleModal,
    closeQuickLoadModal,
  };
}
