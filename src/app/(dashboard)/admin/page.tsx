"use client";

import Link from "next/link";
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
  Edit,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  Trash,
} from "lucide-react";
import type { Product } from "@/types/database";

type ProductFormModalMode = "closed" | "create" | "edit";

interface ProductsListApiResponse {
  products?: Product[];
  message?: string;
}

interface SingleProductApiResponse {
  product?: Product;
  message?: string;
}

interface MeApiResponse {
  userProfile?: {
    fullName: string;
  };
  message?: string;
}

const PRODUCT_CATEGORIES = [
  "DULCE",
  "SALADO",
  "SNACK",
  "BEBIDA",
  "FRUTA",
  "LIBRERIA",
] as const;

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
  const [loggedInUserFullName, setLoggedInUserFullName] = useState<string>("");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [productFormModalMode, setProductFormModalMode] =
    useState<ProductFormModalMode>("closed");
  const [editingProductIdentifier, setEditingProductIdentifier] = useState<
    string | null
  >(null);

  const [productNameInput, setProductNameInput] = useState<string>("");
  const [productSkuInput, setProductSkuInput] = useState<string>("");
  const [productCategoryInput, setProductCategoryInput] =
    useState<Product["category"]>("SNACK");
  const [productImageUrlInput, setProductImageUrlInput] = useState<string>("");
  const [productPriceInput, setProductPriceInput] = useState<string>("");
  const [productCurrentStockInput, setProductCurrentStockInput] =
    useState<string>("");
  const [isProductActive, setIsProductActive] = useState<boolean>(true);

  const [isSavingProductForm, setIsSavingProductForm] =
    useState<boolean>(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string>("");
  const [pageErrorMessage, setPageErrorMessage] = useState<string>("");

  const barcodeInputReference = useRef<HTMLInputElement>(null);

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
        // Keep dashboard usable even if profile request fails.
      }
    };
    void loadLoggedInUserProfile();
  }, []);

  useEffect(() => {
    if (productFormModalMode !== "create") {
      return;
    }

    const animationFrameId = requestAnimationFrame(() => {
      barcodeInputReference.current?.focus();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [productFormModalMode]);

  function openCreateProductModal(): void {
    setEditingProductIdentifier(null);
    setProductNameInput("");
    setProductSkuInput("");
    setProductCategoryInput("SNACK");
    setProductImageUrlInput("");
    setProductPriceInput("");
    setProductCurrentStockInput("");
    setIsProductActive(true);
    setFormErrorMessage("");
    setProductFormModalMode("create");
  }

  function openEditProductModal(product: Product): void {
    setEditingProductIdentifier(product.id);
    setProductNameInput(product.name);
    setProductSkuInput(product.sku);
    setProductCategoryInput(product.category);
    setProductImageUrlInput(product.imageUrl ?? "");
    setProductPriceInput(String(product.price));
    setProductCurrentStockInput(String(product.currentStock));
    setIsProductActive(product.isActive);
    setFormErrorMessage("");
    setProductFormModalMode("edit");
  }

  function closeProductFormModal(): void {
    setProductFormModalMode("closed");
    setEditingProductIdentifier(null);
    setFormErrorMessage("");
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/login");
  }

  async function handleProductFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSavingProductForm(true);
    setFormErrorMessage("");

    const parsedPrice = Number.parseFloat(productPriceInput);
    const parsedCurrentStock = Number.parseInt(productCurrentStockInput, 10);

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormErrorMessage("Invalid price");
      setIsSavingProductForm(false);
      return;
    }

    if (
      !Number.isFinite(parsedCurrentStock) ||
      !Number.isInteger(parsedCurrentStock) ||
      parsedCurrentStock < 0
    ) {
      setFormErrorMessage("Invalid current stock");
      setIsSavingProductForm(false);
      return;
    }

    const trimmedProductName = productNameInput.trim();
    if (trimmedProductName.length === 0) {
      setFormErrorMessage("Product name is required");
      setIsSavingProductForm(false);
      return;
    }

    try {
      if (productFormModalMode === "create") {
        const response = await fetch("/api/products", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedProductName,
            sku: productSkuInput,
            category: productCategoryInput,
            imageUrl:
              productImageUrlInput.trim().length > 0
                ? productImageUrlInput.trim()
                : null,
            price: parsedPrice,
            currentStock: parsedCurrentStock,
            isActive: isProductActive,
          }),
        });

        const responseBody = (await response.json()) as SingleProductApiResponse;

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setFormErrorMessage(
            responseBody.message || "Unable to create product",
          );
          return;
        }

        closeProductFormModal();
        await loadProductListFromServer();
        return;
      }

      if (
        productFormModalMode === "edit" &&
        typeof editingProductIdentifier === "string"
      ) {
        const response = await fetch(
          `/api/products/${editingProductIdentifier}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedProductName,
              sku: productSkuInput,
              category: productCategoryInput,
              imageUrl:
                productImageUrlInput.trim().length > 0
                  ? productImageUrlInput.trim()
                  : null,
              price: parsedPrice,
              currentStock: parsedCurrentStock,
              isActive: isProductActive,
            }),
          },
        );

        const responseBody = (await response.json()) as SingleProductApiResponse;

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setFormErrorMessage(
            responseBody.message || "Unable to update product",
          );
          return;
        }

        closeProductFormModal();
        await loadProductListFromServer();
      }
    } catch {
      setFormErrorMessage("Unexpected error while saving product");
    } finally {
      setIsSavingProductForm(false);
    }
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

  const isProductFormModalOpen = productFormModalMode !== "closed";

  return (
    <main className="min-h-full bg-slate-50 px-4 py-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              {loggedInUserFullName.length > 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Usuario: {loggedInUserFullName}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              Dashboard de Informes
            </Link>
            <button
              type="button"
              onClick={openCreateProductModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <Plus className="size-4" />
              Nuevo producto
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </header>

        {pageErrorMessage.length > 0 ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {pageErrorMessage}
          </p>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Productos
            </h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={productSearchQuery}
                onChange={(event) => setProductSearchQuery(event.target.value)}
                placeholder="Buscar por nombre, categoría o código…"
                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Código de barras</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Creado</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {isLoadingProductList ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      Cargando productos…
                    </td>
                  </tr>
                ) : filteredProductList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      No hay productos que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredProductList.map((product) => (
                    <tr
                      key={product.id}
                      className="bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {product.sku.length > 0 ? product.sku : "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                        {product.price.toFixed(2)}
                      </td>
                      <td
                        className={
                          product.currentStock < 5
                            ? "px-4 py-3 font-semibold text-red-600 dark:text-red-400"
                            : "px-4 py-3 text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {product.currentStock}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {formatArgentinaDateTime(product.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            product.isActive
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                              : "inline-flex rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                          }
                        >
                          {product.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProductModal(product)}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            aria-label="Editar producto"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleSoftDeleteProduct(product.id)
                            }
                            disabled={!product.isActive}
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/40"
                            aria-label="Desactivar producto"
                          >
                            <Trash className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isProductFormModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-form-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2
              id="product-form-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {productFormModalMode === "create"
                ? "Nuevo producto"
                : "Editar producto"}
            </h2>

            <form
              onSubmit={(event) => void handleProductFormSubmit(event)}
              className="mt-4 space-y-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Código de barras
                </span>
                <input
                  ref={barcodeInputReference}
                  type="text"
                  value={productSkuInput}
                  onChange={(event) => setProductSkuInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Opcional — escanear aquí"
                  autoComplete="off"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nombre <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={productNameInput}
                  onChange={(event) => setProductNameInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Categoría <span className="text-red-500">*</span>
                </span>
                <select
                  value={productCategoryInput}
                  onChange={(event) =>
                    setProductCategoryInput(event.target.value as Product["category"])
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  URL de imagen
                </span>
                <input
                  type="url"
                  value={productImageUrlInput}
                  onChange={(event) => setProductImageUrlInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="https://..."
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Precio <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={productPriceInput}
                  onChange={(event) => setProductPriceInput(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Stock actual <span className="text-red-500">*</span>
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={productCurrentStockInput}
                  onChange={(event) =>
                    setProductCurrentStockInput(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                  required
                />
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isProductActive}
                  onChange={(event) => setIsProductActive(event.target.checked)}
                  className="size-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Producto activo
                </span>
              </label>

              {formErrorMessage.length > 0 ? (
                <p className="text-sm text-red-600" role="alert">
                  {formErrorMessage}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeProductFormModal}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProductForm}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {isSavingProductForm ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default AdminDashboardPage;
