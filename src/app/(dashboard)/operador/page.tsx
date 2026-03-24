"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { CheckCircle2, ScanLine, ShoppingCart, Trash2 } from "lucide-react";
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

const FEEDBACK_DISPLAY_TIME_MILLISECONDS = 900;

const OperadorDashboardPage = (): ReactElement => {
  const scannerInputReference = useRef<HTMLInputElement>(null);

  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [saleItemsList, setSaleItemsList] = useState<CartItem[]>([]);
  const [isLoadingProductsCatalog, setIsLoadingProductsCatalog] =
    useState<boolean>(true);
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scanFeedbackMessage, setScanFeedbackMessage] = useState<string>("");

  const totalSaleAmount = useMemo(() => {
    return saleItemsList.reduce((accumulator, saleItem) => {
      return accumulator + saleItem.quantity * saleItem.unitPrice;
    }, 0);
  }, [saleItemsList]);

  const ensureScannerFocus = (): void => {
    scannerInputReference.current?.focus();
  };

  useEffect(() => {
    ensureScannerFocus();
    const focusInterval = window.setInterval(ensureScannerFocus, 800);
    return () => {
      window.clearInterval(focusInterval);
    };
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
          setErrorMessage(responseBody.message || "Unable to load products");
          return;
        }

        const activeProducts = (responseBody.products || []).filter(
          (product) => product.isActive,
        );
        setProductsCatalog(activeProducts);
      } catch {
        setErrorMessage("Unable to load products");
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

  const addProductToSaleItemsList = (product: Product): void => {
    setSaleItemsList((previousSaleItemsList) => {
      const existingSaleItem = previousSaleItemsList.find(
        (saleItem) => saleItem.productIdentifier === product.id,
      );

      const currentQuantityInCart = existingSaleItem?.quantity ?? 0;
      if (currentQuantityInCart + 1 > product.currentStock) {
        setErrorMessage("Insufficient stock for scanned product");
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
      setErrorMessage("Product not found for scanned barcode");
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

  const handleFinalizeSale = async (): Promise<void> => {
    if (saleItemsList.length === 0) {
      setErrorMessage("Add at least one item to finalize the sale");
      return;
    }

    setIsSubmittingSale(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod: "CASH",
          saleItemsList: saleItemsList.map((saleItem) => ({
            productIdentifier: saleItem.productIdentifier,
            quantity: saleItem.quantity,
          })),
        }),
      });

      const responseBody = (await response.json()) as SalesApiResponse;

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(responseBody.message || "Unable to process sale");
        return;
      }

      setSaleItemsList([]);
      showScanFeedback("Sale processed successfully");
    } catch {
      setErrorMessage("Unable to process sale");
    } finally {
      setIsSubmittingSale(false);
      ensureScannerFocus();
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-zinc-950 p-4 md:p-8">
      <section className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
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
            </div>
          </div>
        </header>

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
                      <td className="px-3 py-2">{saleItem.quantity}</td>
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
      </section>
    </main>
  );
};

export default OperadorDashboardPage;
