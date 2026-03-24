"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import {
  CheckCircle2,
  Minus,
  Plus,
  ScanLine,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { Product } from "@/types/database";

interface CartItem {
  productIdentifier: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
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

interface RecentSaleHistoryRecord {
  saleIdentifier: string;
  totalAmount: number;
  paymentMethod: "CASH" | "DEBIT" | "TRANSFER" | "QR";
  createdAt: string;
}

interface RecentSalesHistoryApiResponse {
  recentSalesHistory?: RecentSaleHistoryRecord[];
  message?: string;
}

interface MeApiResponse {
  userProfile?: {
    fullName: string;
  };
  message?: string;
}

type SelectedPaymentMethod = "EFECTIVO" | "DEBITO" | "TRANSFERENCIA" | "QR";

const FEEDBACK_DISPLAY_TIME_MILLISECONDS = 900;
const DEFAULT_BREAK_DURATION_MINUTES = 15;
const BREAK_END_TIME_STORAGE_KEY = "breakEndTimeTimestamp";

function formatArgentinaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function formatRemainingTime(remainingTimeSeconds: number): string {
  const minutes = Math.floor(remainingTimeSeconds / 60);
  const seconds = remainingTimeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const OperadorDashboardPage = (): ReactElement => {
  const scannerInputReference = useRef<HTMLInputElement>(null);
  const [hasClientMounted, setHasClientMounted] = useState<boolean>(false);

  const [loggedInUserFullName, setLoggedInUserFullName] = useState<string>("");
  const [currentArgentinaDateTimeDisplay, setCurrentArgentinaDateTimeDisplay] =
    useState<string>(formatArgentinaDateTime(new Date()));
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<SelectedPaymentMethod>("EFECTIVO");
  const [breakDurationMinutes, setBreakDurationMinutes] = useState<number>(
    DEFAULT_BREAK_DURATION_MINUTES,
  );
  const [remainingTimeSeconds, setRemainingTimeSeconds] = useState<number>(0);
  const [isBreakActive, setIsBreakActive] = useState<boolean>(false);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [saleItemsList, setSaleItemsList] = useState<CartItem[]>([]);
  const [isLoadingProductsCatalog, setIsLoadingProductsCatalog] =
    useState<boolean>(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<string>("");
  const [recentSalesHistory, setRecentSalesHistory] = useState<
    RecentSaleHistoryRecord[]
  >([]);

  const totalSaleAmount = useMemo(() => {
    return saleItemsList.reduce((accumulator, saleItem) => {
      return accumulator + saleItem.quantity * saleItem.unitPrice;
    }, 0);
  }, [saleItemsList]);

  const lowStockProductsList = useMemo(() => {
    return productsCatalog.filter((product) => product.currentStock < 5);
  }, [productsCatalog]);

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

  useEffect(() => {
    setHasClientMounted(true);
    ensureScannerFocus();
    const focusInterval = window.setInterval(ensureScannerFocus, 800);
    return () => {
      window.clearInterval(focusInterval);
    };
  }, []);

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
    const dateTimeInterval = window.setInterval(() => {
      setCurrentArgentinaDateTimeDisplay(formatArgentinaDateTime(new Date()));
    }, 1000);

    return () => {
      window.clearInterval(dateTimeInterval);
    };
  }, []);

  useEffect(() => {
    const loadRecentSalesHistory = async (): Promise<void> => {
      try {
        const response = await fetch("/api/sales/recent", {
          method: "GET",
          credentials: "include",
        });
        const responseBody = (await response.json()) as RecentSalesHistoryApiResponse;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (response.ok) {
          setRecentSalesHistory(responseBody.recentSalesHistory || []);
        }
      } catch {
        // Keep UI usable if sales history is unavailable.
      }
    };
    void loadRecentSalesHistory();
  }, []);

  useEffect(() => {
    const loadLoggedInUserProfile = async (): Promise<void> => {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
        });
        const responseBody = (await response.json()) as MeApiResponse;
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (response.ok && responseBody.userProfile) {
          setLoggedInUserFullName(responseBody.userProfile.fullName);
        }
      } catch {
        // Keep flow available even if profile request fails.
      }
    };
    void loadLoggedInUserProfile();
  }, []);

  useEffect(() => {
    const loadProductsCatalog = async (): Promise<void> => {
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
    };

    void loadProductsCatalog();
  }, []);

  const showScanFeedback = (message: string): void => {
    setScanFeedbackMessage(message);
    window.setTimeout(() => {
      setScanFeedbackMessage("");
    }, FEEDBACK_DISPLAY_TIME_MILLISECONDS);
  };

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
        },
      ];
    });
  };

  const handleScannerSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setErrorMessage("");

    const normalizedScannedBarcode = scannedBarcode.trim();
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
    showScanFeedback(`Added: ${product.name}`);
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

  function handleStartBreak(): void {
    if (!Number.isInteger(breakDurationMinutes) || breakDurationMinutes <= 0) {
      setErrorMessage("La duración del descanso debe ser mayor que cero.");
      return;
    }
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

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/login");
  }

  const handleFinalizeSale = async (): Promise<void> => {
    if (saleItemsList.length === 0) {
      setErrorMessage("Añade al menos un artículo para finalizar la venta.");
      return;
    }

    setIsSubmittingSale(true);
    setErrorMessage("");

    const automaticSaleCategory = isBreakActive ? "RECREO" : "VENTA_LIBRE";

    const paymentMethod = mapSelectedPaymentMethodToApiPaymentMethod();
    const sessionType = automaticSaleCategory;
    const saleItems = saleItemsList.map((saleItem) => ({
      product_id: saleItem.productIdentifier,
      quantity: saleItem.quantity,
    }));

    console.log("Sending to RPC:", { paymentMethod, sessionType, saleItems });

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          automaticSaleCategory: sessionType,
          saleItemsList: saleItems,
        }),
      });

      const responseBody = (await response.json()) as SalesApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(responseBody.message || "No se puede procesar la venta");
        return;
      }

      setSaleItemsList([]);
      showScanFeedback("Sale processed successfully");
      const recentSalesHistoryResponse = await fetch("/api/sales/recent", {
        method: "GET",
        credentials: "include",
      });
      const recentSalesHistoryBody =
        (await recentSalesHistoryResponse.json()) as RecentSalesHistoryApiResponse;
      if (recentSalesHistoryResponse.ok) {
        setRecentSalesHistory(recentSalesHistoryBody.recentSalesHistory || []);
      }
    } catch {
      setErrorMessage("No se puede procesar la venta");
    } finally {
      setIsSubmittingSale(false);
      ensureScannerFocus();
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-zinc-950 p-4 md:p-8">
      <section className="mx-auto flex max-w-7xl gap-5">
        <div className="flex-1 space-y-5">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <ShoppingCart className="size-6 text-zinc-700 dark:text-zinc-200" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Modo Recreo
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Escaneo rapido y venta inmediata
                </p>
                {loggedInUserFullName.length > 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Usuario: {loggedInUserFullName}
                  </p>
                ) : null}
                <p
                  className="text-xs text-zinc-500 dark:text-zinc-400"
                  suppressHydrationWarning
                >
                  Hora AR:{" "}
                  {hasClientMounted
                    ? currentArgentinaDateTimeDisplay
                    : "--/--/---- --:--:--"}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Duración recreo (minutos)
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={breakDurationMinutes}
                onChange={(event) =>
                  setBreakDurationMinutes(Number.parseInt(event.target.value || "0", 10))
                }
                className="w-44 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
            {!isBreakActive && remainingTimeSeconds === 0 ? (
              <button
                type="button"
                onClick={handleStartBreak}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Iniciar Recreo
              </button>
            ) : null}
            {isBreakActive || remainingTimeSeconds > 0 ? (
              <div className="flex items-center gap-2">
                <p className="animate-pulse rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Termina en: {formatRemainingTime(remainingTimeSeconds)}
                </p>
                <button
                  type="button"
                  onClick={handleCancelBreak}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancelar Recreo
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleScannerSubmit} className="space-y-3">
            <label
              htmlFor="scanned-barcode-input"
              className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              <ScanLine className="size-4" />
              Escanear codigo de barras
            </label>
            <input
              ref={scannerInputReference}
              id="scanned-barcode-input"
              value={scannedBarcode}
              onChange={(event) => setScannedBarcode(event.target.value)}
              autoComplete="off"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Escanea y presiona Enter"
            />
          </form>

          {scanFeedbackMessage.length > 0 ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <CheckCircle2 className="size-4" />
              {scanFeedbackMessage}
            </div>
          ) : null}

          {errorMessage.length > 0 ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Carrito
          </h2>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70">
                <tr>
                  <th className="px-3 py-2 font-medium">Producto</th>
                  <th className="px-3 py-2 font-medium">Cantidad</th>
                  <th className="px-3 py-2 font-medium">Subtotal</th>
                  <th className="px-3 py-2 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {isLoadingProductsCatalog ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-5 text-center text-zinc-500">
                      Cargando productos...
                    </td>
                  </tr>
                ) : saleItemsList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-5 text-center text-zinc-500">
                      Sin items en el carrito.
                    </td>
                  </tr>
                ) : (
                  saleItemsList.map((saleItem) => (
                    <tr key={saleItem.productIdentifier}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {saleItem.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          Codigo: {saleItem.sku || "-"}
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
                            className="inline-flex size-7 items-center justify-center rounded-md border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
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
                            className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-center text-sm dark:border-zinc-700 dark:bg-zinc-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSaleItemQuantity(
                                saleItem.productIdentifier,
                                saleItem.quantity + 1,
                              )
                            }
                            className="inline-flex size-7 items-center justify-center rounded-md border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {(saleItem.quantity * saleItem.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeSaleItem(saleItem.productIdentifier)}
                          className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label="Remove cart item"
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
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-xl dark:border-emerald-900 dark:bg-emerald-950">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <label className="mb-2 block text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Método de pago
              </label>
              <div className="mb-3 flex flex-wrap gap-2">
                {(
                  ["EFECTIVO", "DEBITO", "TRANSFERENCIA", "QR"] as const
                ).map((paymentMethodOption) => (
                  <button
                    key={paymentMethodOption}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(paymentMethodOption)}
                    className={
                      selectedPaymentMethod === paymentMethodOption
                        ? "rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
                        : "rounded-lg border border-emerald-400 bg-white px-3 py-2 text-sm font-medium text-zinc-800 dark:border-emerald-700 dark:bg-zinc-900 dark:text-zinc-100"
                    }
                  >
                    {paymentMethodOption}
                  </button>
                ))}
              </div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Total Venta
              </p>
              <p className="text-4xl font-bold text-emerald-800 dark:text-emerald-200">
                {totalSaleAmount.toFixed(2)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleFinalizeSale()}
              disabled={isSubmittingSale || saleItemsList.length === 0}
              className="rounded-xl bg-emerald-600 px-8 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingSale ? "Procesando..." : "Finalizar Venta"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Historial reciente (últimas 10 ventas)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70">
                <tr>
                  <th className="px-3 py-2 font-medium">Total</th>
                  <th className="px-3 py-2 font-medium">Pago</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {recentSalesHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-5 text-center text-zinc-500">
                      Sin ventas recientes.
                    </td>
                  </tr>
                ) : (
                  recentSalesHistory.map((saleHistoryRecord) => (
                    <tr key={saleHistoryRecord.saleIdentifier}>
                      <td className="px-3 py-2 font-medium">
                        {saleHistoryRecord.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        {saleHistoryRecord.paymentMethod}
                      </td>
                      <td className="px-3 py-2">
                        {new Intl.DateTimeFormat("es-AR", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(saleHistoryRecord.createdAt))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        </div>

        <aside className="w-full max-w-xs self-start rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xl dark:border-amber-900 dark:bg-amber-950">
          <h3 className="mb-3 text-base font-semibold text-amber-900 dark:text-amber-100">
            Alertas de stock bajo
          </h3>
          <div className="space-y-2">
            {lowStockProductsList.length === 0 ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No hay productos en nivel crítico.
              </p>
            ) : (
              lowStockProductsList.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-red-300 bg-red-50 p-2 dark:border-red-900 dark:bg-red-950"
                >
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {product.name}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Stock actual: {product.currentStock}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
};

export default OperadorDashboardPage;
