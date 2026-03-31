"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactElement,
} from "react";
import { ImagePlus, Loader2, ScanLine } from "lucide-react";
import type { Product } from "@/types/database";
import { BarcodeCameraScanner } from "@/components/admin/BarcodeCameraScanner";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export type ProductFormModalMode = "create" | "edit";

const PRODUCT_IMAGES_BUCKET_NAME = "product-images";
const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function resolveImageMimeAndExtension(file: File): {
  mimeType: string;
  extension: string;
} | null {
  const direct = ALLOWED_IMAGE_EXTENSION_BY_MIME[file.type];
  if (typeof direct === "string") {
    return { mimeType: file.type, extension: direct };
  }
  const lowerName = file.name.trim().toLowerCase();
  const extToMime: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  for (const [suffix, mime] of Object.entries(extToMime)) {
    if (lowerName.endsWith(suffix)) {
      const extension = ALLOWED_IMAGE_EXTENSION_BY_MIME[mime];
      if (typeof extension === "string") {
        return { mimeType: mime, extension };
      }
    }
  }
  return null;
}

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ProductFormModalMode;
  /** En edición: producto a cargar en el formulario */
  initialProduct?: Product | null;
  editingProductId?: string | null;
  productList: Product[];
  onSuccess: () => void | Promise<void>;
  /** z-index del overlay (p. ej. z-56 si debe quedar sobre otros modales) */
  overlayZClass?: string;
}

/** Categoría enviada al API: sin espacios laterales y en mayúsculas. */
function normalizeCategoryForApi(raw: string): string {
  return raw.trim().toUpperCase();
}

/** UUID v4 (formato aceptado por Postgres / Supabase para `id`). */
const PRODUCT_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidProductComponentUuid(componentId: string): boolean {
  return PRODUCT_UUID_REGEX.test(componentId.trim());
}

function extractServerErrorMessage(
  body: unknown,
  fallback: string,
): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error", "hint", "details"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }
  }
  return fallback;
}

async function parseResponseJsonSafe(
  response: Response,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Opciones únicas para <datalist> (una entrada por categoría, sin duplicar por mayúsculas/minúsculas). */
function dedupeCategoriesForDatalist(categories: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of categories) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const key = trimmed.toUpperCase();
    if (!seen.has(key)) {
      seen.set(key, key);
    }
  }
  return Array.from(seen.values()).sort((categoryA, categoryB) =>
    categoryA.localeCompare(categoryB, "es"),
  );
}

function deriveMarginPercentFromCostAndPrice(
  costPrice: number,
  salePrice: number,
): string {
  if (costPrice <= 0 || !Number.isFinite(costPrice)) {
    return "0";
  }
  const marginPercent = (salePrice / costPrice - 1) * 100;
  if (!Number.isFinite(marginPercent)) {
    return "0";
  }
  return String(Math.round(marginPercent * 100) / 100);
}

export function ProductFormModal({
  isOpen,
  onClose,
  mode,
  initialProduct = null,
  editingProductId = null,
  productList,
  onSuccess,
  overlayZClass = "z-50",
}: ProductFormModalProps): ReactElement | null {
  const reactId = useId();
  const titleDomId = `product-form-title-${reactId}`;
  const categoryDatalistDomId = `${reactId}-product-categories-datalist`;
  const barcodeInputReference = useRef<HTMLInputElement>(null);

  const [productNameInput, setProductNameInput] = useState<string>("");
  const [productSkuInput, setProductSkuInput] = useState<string>("");
  const [productCategoryInput, setProductCategoryInput] = useState<string>("");
  const [productImageUrlInput, setProductImageUrlInput] = useState<string>("");
  const [productImageLocalPreviewUrl, setProductImageLocalPreviewUrl] =
    useState<string>("");
  const [productMarginPercentInput, setProductMarginPercentInput] =
    useState<string>("0");
  const [fallbackCatalogPriceForProductForm, setFallbackCatalogPriceForProductForm] =
    useState<number | null>(null);
  const [productCostPriceInput, setProductCostPriceInput] =
    useState<string>("");
  const [productCurrentStockInput, setProductCurrentStockInput] =
    useState<string>("");
  const [isProductActive, setIsProductActive] = useState<boolean>(true);
  const [isBulkProductInput, setIsBulkProductInput] = useState<boolean>(false);
  const [quantityPerUnitInput, setQuantityPerUnitInput] = useState<string>("");
  const [isComboProductInput, setIsComboProductInput] = useState<boolean>(false);
  const [comboComponentsInput, setComboComponentsInput] = useState<
    Record<string, string>
  >({});
  const [comboComponentSearchInput, setComboComponentSearchInput] =
    useState<string>("");
  const [comboComponentSelectedId, setComboComponentSelectedId] =
    useState<string>("");
  const [comboComponentWarningMessage, setComboComponentWarningMessage] =
    useState<string>("");

  const [isSavingProductForm, setIsSavingProductForm] =
    useState<boolean>(false);
  const [isUploadingProductImage, setIsUploadingProductImage] =
    useState<boolean>(false);
  const [isBarcodeCameraScannerOpen, setIsBarcodeCameraScannerOpen] =
    useState<boolean>(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string>("");
  const [categoriesFromApi, setCategoriesFromApi] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] =
    useState<boolean>(false);
  const [categoriesLoadErrorMessage, setCategoriesLoadErrorMessage] =
    useState<string>("");
  const previousLocalPreviewUrlReference = useRef<string>("");

  const resolvedEditingId = useMemo(() => {
    if (mode === "edit") {
      return editingProductId ?? initialProduct?.id ?? null;
    }
    return null;
  }, [mode, editingProductId, initialProduct?.id]);

  const categoryDatalistOptions = useMemo(
    () => dedupeCategoriesForDatalist(categoriesFromApi),
    [categoriesFromApi],
  );
  const supabaseBrowserClient = useMemo(() => createSupabaseBrowserClient(), []);

  const knownCategoryUppercaseSet = useMemo(() => {
    const set = new Set<string>();
    for (const label of categoryDatalistOptions) {
      set.add(label.toUpperCase());
    }
    return set;
  }, [categoryDatalistOptions]);

  const isNewCategoryHintVisible = useMemo(() => {
    const trimmed = productCategoryInput.trim();
    if (trimmed.length === 0) {
      return false;
    }
    return !knownCategoryUppercaseSet.has(trimmed.toUpperCase());
  }, [productCategoryInput, knownCategoryUppercaseSet]);

  const isCreateSubmitBlockedByImage = useMemo(() => {
    return mode === "create" && productImageUrlInput.trim().length === 0;
  }, [mode, productImageUrlInput]);

  const resolvedProductImagePreviewUrl = useMemo(() => {
    if (productImageLocalPreviewUrl.trim().length > 0) {
      return productImageLocalPreviewUrl.trim();
    }
    return productImageUrlInput.trim();
  }, [productImageLocalPreviewUrl, productImageUrlInput]);

  const replaceLocalPreviewUrl = useCallback((nextUrl: string): void => {
    const previousUrl = previousLocalPreviewUrlReference.current;
    if (previousUrl.length > 0 && previousUrl !== nextUrl) {
      URL.revokeObjectURL(previousUrl);
    }
    previousLocalPreviewUrlReference.current = nextUrl;
    setProductImageLocalPreviewUrl(nextUrl);
  }, []);

  const populateFromProduct = useCallback((product: Product) => {
    setProductNameInput(product.name);
    setProductSkuInput(product.sku);
    setProductCategoryInput(product.category);
    setProductImageUrlInput(product.imageUrl ?? "");
    setFallbackCatalogPriceForProductForm(product.price);
    const costString =
      product.costPrice === null || product.costPrice === undefined
        ? ""
        : String(product.costPrice);
    setProductCostPriceInput(costString);
    if (costString.length > 0) {
      const costValue = product.costPrice as number;
      setProductMarginPercentInput(
        deriveMarginPercentFromCostAndPrice(costValue, product.price),
      );
    } else {
      setProductMarginPercentInput("0");
    }
    setProductCurrentStockInput(String(product.currentStock));
    setIsProductActive(product.isActive);
    setIsBulkProductInput(product.isBulk);
    setQuantityPerUnitInput(
      product.quantityPerUnit === null ? "" : String(product.quantityPerUnit),
    );
    setIsComboProductInput(product.isCombo);
    setComboComponentsInput({});
    setComboComponentSearchInput("");
    setComboComponentSelectedId("");
    setComboComponentWarningMessage("");
    replaceLocalPreviewUrl("");
  }, [replaceLocalPreviewUrl]);

  const resetCreateForm = useCallback(() => {
    setProductNameInput("");
    setProductSkuInput("");
    setProductCategoryInput("");
    setProductImageUrlInput("");
    setProductMarginPercentInput("0");
    setFallbackCatalogPriceForProductForm(null);
    setProductCostPriceInput("");
    setProductCurrentStockInput("");
    setIsProductActive(true);
    setIsBulkProductInput(false);
    setQuantityPerUnitInput("");
    setIsComboProductInput(false);
    setComboComponentsInput({});
    setComboComponentSearchInput("");
    setComboComponentSelectedId("");
    setComboComponentWarningMessage("");
    setFormErrorMessage("");
    replaceLocalPreviewUrl("");
  }, [replaceLocalPreviewUrl]);

  useEffect(() => {
    return () => {
      const previewUrl = previousLocalPreviewUrlReference.current;
      if (previewUrl.length > 0) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (mode === "create") {
      resetCreateForm();
    } else if (mode === "edit" && initialProduct) {
      populateFromProduct(initialProduct);
      setFormErrorMessage("");
    }
  }, [isOpen, mode, initialProduct, resetCreateForm, populateFromProduct]);

  useEffect(() => {
    if (!isOpen || mode !== "create") {
      return;
    }
    const animationFrameId = requestAnimationFrame(() => {
      barcodeInputReference.current?.focus();
    });
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setIsLoadingCategories(true);
    setCategoriesLoadErrorMessage("");

    void (async (): Promise<void> => {
      try {
        const response = await fetch("/api/categories", {
          method: "GET",
          credentials: "include",
        });
        const body = await parseResponseJsonSafe(response);
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!response.ok) {
          if (!cancelled) {
            setCategoriesLoadErrorMessage(
              extractServerErrorMessage(
                body,
                "No se pudo cargar el listado de categorías",
              ),
            );
            setCategoriesFromApi([]);
          }
          return;
        }
        const record = body as { categories?: Array<{ name?: string }> };
        const names =
          Array.isArray(record.categories) && record.categories.length > 0
            ? record.categories
                .map((row) =>
                  typeof row.name === "string" ? row.name.trim() : "",
                )
                .filter((label) => label.length > 0)
            : [];
        if (!cancelled) {
          setCategoriesFromApi(names);
        }
      } catch {
        if (!cancelled) {
          setCategoriesLoadErrorMessage("Error al cargar categorías");
          setCategoriesFromApi([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || mode !== "create") {
      return;
    }
    if (categoryDatalistOptions.length === 0) {
      return;
    }
    setProductCategoryInput((previous) => {
      if (previous.trim().length > 0) {
        return previous;
      }
      return categoryDatalistOptions[0] ?? "";
    });
  }, [isOpen, mode, categoryDatalistOptions]);

  const resolvedProductFormPvp = useMemo(() => {
    const trimmedCost = productCostPriceInput.trim();
    const marginRaw = productMarginPercentInput.trim();
    const marginNumber =
      marginRaw.length === 0
        ? 0
        : Number.parseFloat(marginRaw.replace(",", "."));

    if (!Number.isFinite(marginNumber)) {
      return { pvp: null as number | null, marginError: true, costError: false };
    }

    if (trimmedCost.length === 0) {
      if (
        mode === "edit" &&
        fallbackCatalogPriceForProductForm !== null
      ) {
        return {
          pvp: fallbackCatalogPriceForProductForm,
          marginError: false,
          costError: false,
        };
      }
      return { pvp: null, marginError: false, costError: false };
    }

    const costNumber = Number.parseFloat(trimmedCost.replace(",", "."));
    if (!Number.isFinite(costNumber) || costNumber < 0) {
      return { pvp: null, marginError: false, costError: true };
    }

    const pvp =
      Math.round(costNumber * (1 + marginNumber / 100) * 100) / 100;
    return { pvp, marginError: false, costError: false };
  }, [
    productCostPriceInput,
    productMarginPercentInput,
    mode,
    fallbackCatalogPriceForProductForm,
  ]);

  function handleClose(): void {
    setFormErrorMessage("");
    setFallbackCatalogPriceForProductForm(null);
    setIsUploadingProductImage(false);
    replaceLocalPreviewUrl("");
    onClose();
  }

  async function handleProductImageFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const inputElement = event.currentTarget;
    const fileList = inputElement.files;

    console.log("--- UPLOAD START ---");

    if (!fileList || fileList.length === 0) {
      console.log("No file in input; aborting.");
      return;
    }

    const selectedFile = fileList[0];
    console.log("File detected:", selectedFile.name, selectedFile.size);

    const previewUrl = URL.createObjectURL(selectedFile);
    console.log("Local Preview URL created:", previewUrl);

    replaceLocalPreviewUrl(previewUrl);
    setIsUploadingProductImage(true);
    setFormErrorMessage("");

    try {
      const resolved = resolveImageMimeAndExtension(selectedFile);
      if (resolved === null) {
        const message =
          "Formato no permitido. Use JPEG, PNG, WebP o GIF (o el archivo no tiene tipo MIME reconocible).";
        setFormErrorMessage(message);
        console.error("[ProductFormModal] Unsupported file type:", {
          name: selectedFile.name,
          type: selectedFile.type,
        });
        return;
      }

      if (selectedFile.size > MAX_PRODUCT_IMAGE_BYTES) {
        setFormErrorMessage("La imagen supera el tamaño máximo permitido (5 MB).");
        return;
      }

      const { mimeType, extension: resolvedExtension } = resolved;
      const objectPath = `products/${crypto.randomUUID()}-${Date.now()}.${resolvedExtension}`;

      console.log("[ProductFormModal] Starting Supabase storage upload", {
        objectPath,
        mimeType,
        bucket: PRODUCT_IMAGES_BUCKET_NAME,
      });

      const { error: uploadError } = await supabaseBrowserClient.storage
        .from(PRODUCT_IMAGES_BUCKET_NAME)
        .upload(objectPath, selectedFile, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[ProductFormModal] Storage upload error:", {
          message: uploadError.message,
          name: uploadError.name,
          objectPath,
          bucket: PRODUCT_IMAGES_BUCKET_NAME,
        });
        setFormErrorMessage(uploadError.message || "No se pudo subir la imagen");
        return;
      }

      const { data: publicUrlData } = supabaseBrowserClient.storage
        .from(PRODUCT_IMAGES_BUCKET_NAME)
        .getPublicUrl(objectPath);
      const normalizedPublicUrl =
        typeof publicUrlData?.publicUrl === "string"
          ? publicUrlData.publicUrl.trim()
          : "";

      if (normalizedPublicUrl.length > 0) {
        console.log("[ProductFormModal] Public URL after getPublicUrl:", normalizedPublicUrl);
        setProductImageUrlInput(normalizedPublicUrl);
      } else {
        console.error("[ProductFormModal] Empty public URL after upload", {
          objectPath,
          bucket: PRODUCT_IMAGES_BUCKET_NAME,
        });
        setFormErrorMessage("La URL pública de la imagen llegó vacía.");
      }
    } catch (err) {
      console.error("CRITICAL UPLOAD ERROR:", err);
      const message =
        err instanceof Error ? err.message : String(err);
      alert(`Error al procesar imagen: ${message}`);
      setFormErrorMessage(`Error al subir imagen: ${message}`);
    } finally {
      setIsUploadingProductImage(false);
      inputElement.value = "";
    }
  }

  async function handleProductFormSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setIsSavingProductForm(true);
    setFormErrorMessage("");

    if (isUploadingProductImage) {
      setFormErrorMessage("Espere a que finalice la subida de la imagen.");
      setIsSavingProductForm(false);
      return;
    }

    const trimmedImageUrlForSubmit = productImageUrlInput.trim();
    if (mode === "create" && trimmedImageUrlForSubmit.length === 0) {
      setFormErrorMessage("Debe subir una imagen antes de crear el producto.");
      setIsSavingProductForm(false);
      return;
    }

    const parsedCurrentStock = Number.parseInt(productCurrentStockInput, 10);
    const parsedQuantityPerUnit = Number.parseFloat(
      quantityPerUnitInput.replace(",", "."),
    );
    const trimmedCostPrice = productCostPriceInput.trim();
    let resolvedCostPrice: number | null = null;
    if (trimmedCostPrice.length > 0) {
      const parsedCostPrice = Number.parseFloat(
        trimmedCostPrice.replace(",", "."),
      );
      if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
        setFormErrorMessage("Costo (precio de costo) inválido");
        setIsSavingProductForm(false);
        return;
      }
      resolvedCostPrice = parsedCostPrice;
    }

    if (resolvedProductFormPvp.marginError) {
      setFormErrorMessage("Margen de beneficio (%) inválido");
      setIsSavingProductForm(false);
      return;
    }

    if (resolvedProductFormPvp.costError) {
      setFormErrorMessage("Costo (precio de costo) inválido");
      setIsSavingProductForm(false);
      return;
    }

    if (mode === "create" && trimmedCostPrice.length === 0) {
      setFormErrorMessage("Indique el costo (precio de costo) para calcular el PVP");
      setIsSavingProductForm(false);
      return;
    }

    const resolvedPvp = resolvedProductFormPvp.pvp;
    if (
      resolvedPvp === null ||
      !Number.isFinite(resolvedPvp) ||
      resolvedPvp < 0
    ) {
      setFormErrorMessage(
        "Complete costo y margen para obtener el PVP (precio de venta)",
      );
      setIsSavingProductForm(false);
      return;
    }

    if (
      !Number.isFinite(parsedCurrentStock) ||
      !Number.isInteger(parsedCurrentStock) ||
      parsedCurrentStock < 0
    ) {
      setFormErrorMessage("Stock inválido");
      setIsSavingProductForm(false);
      return;
    }

    if (isBulkProductInput) {
      if (!Number.isFinite(parsedQuantityPerUnit) || parsedQuantityPerUnit <= 0) {
        setFormErrorMessage("Cantidad por unidad inválida para producto granel");
        setIsSavingProductForm(false);
        return;
      }
    }

    const trimmedProductName = productNameInput.trim();
    if (trimmedProductName.length === 0) {
      setFormErrorMessage("El nombre del producto es obligatorio");
      setIsSavingProductForm(false);
      return;
    }

    const categoryForApi = normalizeCategoryForApi(productCategoryInput);
    if (categoryForApi.length === 0) {
      setFormErrorMessage("La categoría es obligatoria");
      setIsSavingProductForm(false);
      return;
    }

    const catalogProductIdSet = new Set(
      productList.map((product) => product.id),
    );

    const sanitizedComboItems: Array<{
      componentProductId: string;
      quantityPerCombo: number;
    }> = [];

    for (const [rawKey, quantityRaw] of Object.entries(comboComponentsInput)) {
      const componentProductId = rawKey.trim();
      const quantityPerCombo = Number.parseFloat(
        quantityRaw.replace(",", "."),
      );
      if (!isValidProductComponentUuid(componentProductId)) {
        continue;
      }
      if (!catalogProductIdSet.has(componentProductId)) {
        continue;
      }
      if (
        resolvedEditingId !== null &&
        componentProductId === resolvedEditingId
      ) {
        continue;
      }
      if (!Number.isFinite(quantityPerCombo) || quantityPerCombo <= 0) {
        continue;
      }
      sanitizedComboItems.push({ componentProductId, quantityPerCombo });
    }

    const hadComboComponentKeys = Object.keys(comboComponentsInput).length > 0;

    if (isComboProductInput) {
      if (sanitizedComboItems.length === 0) {
        setFormErrorMessage(
          hadComboComponentKeys
            ? "Los componentes del combo deben ser productos válidos del catálogo (UUID reconocidos)."
            : "Seleccione al menos un componente para el combo",
        );
        setIsSavingProductForm(false);
        return;
      }
    }

    try {
      if (mode === "create") {
        const response = await fetch("/api/products", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedProductName,
            sku: productSkuInput,
            category: categoryForApi,
            imageUrl:
              trimmedImageUrlForSubmit.length > 0
                ? trimmedImageUrlForSubmit
                : null,
            price: resolvedPvp,
            costPrice: resolvedCostPrice,
            isBulk: isBulkProductInput,
            quantityPerUnit: isBulkProductInput ? parsedQuantityPerUnit : null,
            isCombo: isComboProductInput,
            comboItems: sanitizedComboItems,
            currentStock: parsedCurrentStock,
            isActive: isProductActive,
          }),
        });

        const responseBody = await parseResponseJsonSafe(response);

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setFormErrorMessage(
            extractServerErrorMessage(
              responseBody,
              "No se pudo crear el producto",
            ),
          );
          return;
        }

        handleClose();
        await onSuccess();
        return;
      }

      if (
        mode === "edit" &&
        typeof resolvedEditingId === "string"
      ) {
        const response = await fetch(
          `/api/products/${resolvedEditingId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedProductName,
              sku: productSkuInput,
              category: categoryForApi,
              imageUrl:
                trimmedImageUrlForSubmit.length > 0
                  ? trimmedImageUrlForSubmit
                  : null,
              price: resolvedPvp,
              costPrice: resolvedCostPrice,
              isBulk: isBulkProductInput,
              quantityPerUnit: isBulkProductInput ? parsedQuantityPerUnit : null,
              isCombo: isComboProductInput,
              comboItems: sanitizedComboItems,
              currentStock: parsedCurrentStock,
              isActive: isProductActive,
            }),
          },
        );

        const responseBody = await parseResponseJsonSafe(response);

        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          setFormErrorMessage(
            extractServerErrorMessage(
              responseBody,
              "No se pudo actualizar el producto",
            ),
          );
          return;
        }

        handleClose();
        await onSuccess();
      }
    } catch (error: unknown) {
      setFormErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Error inesperado al guardar el producto",
      );
    } finally {
      setIsSavingProductForm(false);
    }
  }

  function handleAddComboComponent(): void {
    if (comboComponentSelectedId.length === 0) {
      return;
    }
    if (comboComponentsInput[comboComponentSelectedId] !== undefined) {
      setComboComponentWarningMessage("Ese producto ya fue agregado al combo.");
      return;
    }
    setComboComponentsInput((previous) => {
      if (previous[comboComponentSelectedId] !== undefined) {
        return previous;
      }
      return { ...previous, [comboComponentSelectedId]: "1" };
    });
    setComboComponentWarningMessage("");
    setComboComponentSelectedId("");
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 overflow-hidden ${overlayZClass} flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleDomId}
      >
        <div className="flex max-h-[min(85vh,100dvh)] w-full max-w-7xl min-w-0 flex-col overflow-hidden rounded-2xl border border-white/25 bg-white/85 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 dark:ring-white/10">
          <div className="shrink-0 border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-700/80">
            <h2
              id={titleDomId}
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {mode === "create" ? "Nuevo producto" : "Editar producto"}
            </h2>
          </div>

          <form
            onSubmit={(event) => void handleProductFormSubmit(event)}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <div className="grid min-w-0 gap-6 p-5 md:p-6 lg:grid-cols-2">
                {/* Columna 1: información e imagen */}
                <div className="min-w-0 space-y-5">
                  <div className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Código de barras (SKU)
                    </span>
                    <div className="mt-1 flex w-full flex-col gap-2">
                      <input
                        ref={barcodeInputReference}
                        id="product-sku-input"
                        name="sku"
                        type="text"
                        value={productSkuInput}
                        onChange={(event) =>
                          setProductSkuInput(event.target.value)
                        }
                        className="w-full min-w-0 rounded-lg border border-zinc-300/90 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/90"
                        placeholder="Opcional — manual o cámara"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setIsBarcodeCameraScannerOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <ScanLine className="size-4" aria-hidden />
                        Escanear con cámara
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Nombre <span className="text-red-500">*</span>
                    </span>
                    <input
                      id="product-name-input"
                      name="name"
                      type="text"
                      value={productNameInput}
                      onChange={(event) =>
                        setProductNameInput(event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/90"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Categoría <span className="text-red-500">*</span>
                    </span>
                    {isLoadingCategories ? (
                      <p className="mt-1 text-xs text-zinc-500">
                        Cargando categorías…
                      </p>
                    ) : null}
                    {categoriesLoadErrorMessage.length > 0 ? (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                        {categoriesLoadErrorMessage} Puede escribir la categoría
                        manualmente.
                      </p>
                    ) : null}
                    <input
                      id="product-category-input"
                      name="category"
                      type="text"
                      value={productCategoryInput}
                      onChange={(event) =>
                        setProductCategoryInput(event.target.value)
                      }
                      list={categoryDatalistDomId}
                      className="mt-1 w-full rounded-lg border border-zinc-300/90 bg-white/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/90"
                      placeholder="Escriba o elija una categoría"
                      required
                      maxLength={80}
                    />
                    <datalist id={categoryDatalistDomId}>
                      {categoryDatalistOptions.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                    {isNewCategoryHintVisible ? (
                      <p className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        Nueva categoría detectada: se guardará en MAYÚSCULAS.
                      </p>
                    ) : null}
                    <span className="mt-1 block text-xs text-zinc-500">
                      Listado desde la base de datos; puede añadir una nueva
                      (máx. 80 caracteres). Se envía en mayúsculas.
                    </span>
                  </label>

                  <div className="block">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Imagen del producto
                    </span>
                    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-zinc-300/90 bg-white/60 p-4 dark:border-zinc-600 dark:bg-zinc-800/40">
                      {resolvedProductImagePreviewUrl.length > 0 ? (
                        <div className="flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element -- URL dinámica de Storage */}
                          <img
                            src={resolvedProductImagePreviewUrl}
                            alt="Vista previa"
                            className="max-h-36 max-w-full rounded-lg object-contain shadow-sm"
                          />
                        </div>
                      ) : null}
                      <label
                        htmlFor="product-image-file-input"
                        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white/80 px-4 py-6 text-center transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800/60 dark:hover:bg-zinc-800"
                      >
                        <input
                          id="product-image-file-input"
                          name="productImageFile"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                          className="sr-only"
                          onChange={(event) => {
                            console.log("[product-image-file-input] onChange fired");
                            void handleProductImageFileSelected(event);
                          }}
                        />
                        {isUploadingProductImage ? (
                          <Loader2 className="size-8 animate-spin text-zinc-500" />
                        ) : (
                          <ImagePlus className="size-8 text-zinc-500" />
                        )}
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                          {isUploadingProductImage
                            ? "Subiendo…"
                            : "Elegir archivo (bucket product-images)"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          JPEG, PNG, WebP o GIF · máx. 5 MB
                        </span>
                      </label>
                      {resolvedProductImagePreviewUrl.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProductImageUrlInput("");
                            replaceLocalPreviewUrl("");
                          }}
                          className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                        >
                          Quitar imagen
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Columna 2: grid interno — precios/stock | opciones avanzadas */}
                <div className="grid min-h-0 min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col space-y-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Costo (precio de costo){" "}
                        <span className="text-red-500">*</span>
                      </span>
                      <input
                        id="product-cost-price-input"
                        name="costPrice"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={productCostPriceInput}
                        onChange={(event) =>
                          setProductCostPriceInput(event.target.value)
                        }
                        className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300/90 bg-zinc-100/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                        placeholder="0"
                        required={mode === "create"}
                      />
                      <span className="mt-1 block text-xs text-zinc-500">
                        En edición puede dejarse vacío si el producto aún no tiene
                        costo registrado (se conserva el PVP actual).
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Margen de beneficio (%)
                      </span>
                      <input
                        id="product-margin-percent-input"
                        name="marginPercent"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={productMarginPercentInput}
                        onChange={(event) =>
                          setProductMarginPercentInput(event.target.value)
                        }
                        className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300/90 bg-zinc-100/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                        placeholder="0"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        PVP (precio de venta){" "}
                        <span className="text-red-500">*</span>
                      </span>
                      <input
                        id="product-pvp-input"
                        name="price"
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={
                          resolvedProductFormPvp.pvp !== null
                            ? resolvedProductFormPvp.pvp.toFixed(2)
                            : ""
                        }
                        placeholder="—"
                        className="mt-1 w-full min-w-0 cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm font-semibold tabular-nums text-zinc-800 outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                        aria-readonly="true"
                      />
                      <span className="mt-1 block text-xs text-zinc-500">
                        Calculado automáticamente a partir del costo y el margen.
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Stock actual <span className="text-red-500">*</span>
                      </span>
                      <input
                        id="product-current-stock-input"
                        name="currentStock"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        value={productCurrentStockInput}
                        onChange={(event) =>
                          setProductCurrentStockInput(event.target.value)
                        }
                        className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300/90 bg-zinc-100/80 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                        required
                      />
                    </label>

                    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-zinc-200/80 bg-white/50 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800/40">
                      <input
                        id="product-is-active-input"
                        name="isActive"
                        type="checkbox"
                        checked={isProductActive}
                        onChange={(event) =>
                          setIsProductActive(event.target.checked)
                        }
                        className="size-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                      />
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Producto activo
                      </span>
                    </label>
                  </div>

                  <div className="flex min-h-0 min-w-0 flex-col space-y-3 rounded-xl border border-zinc-200/80 bg-zinc-100/70 p-4 md:p-5 dark:border-zinc-600 dark:bg-zinc-800/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Opciones avanzadas
                    </p>

                    <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-zinc-200/60 bg-white/40 px-3 py-2 hover:bg-zinc-200/40 dark:border-zinc-600/80 dark:bg-zinc-800/30 dark:hover:bg-zinc-700/40">
                      <input
                        id="product-is-bulk-input"
                        name="isBulk"
                        type="checkbox"
                        checked={isBulkProductInput}
                        onChange={(event) =>
                          setIsBulkProductInput(event.target.checked)
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                      />
                      <span className="text-sm font-semibold leading-snug text-zinc-700 dark:text-zinc-300">
                        Es granel
                      </span>
                    </label>

                    {isBulkProductInput ? (
                      <label className="block w-full">
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                          Cantidad por unidad (ej: 6)
                        </span>
                        <input
                          id="product-quantity-per-unit-input"
                          name="quantityPerUnit"
                          type="number"
                          inputMode="decimal"
                          min={0.0001}
                          step="0.0001"
                          value={quantityPerUnitInput}
                          onChange={(event) =>
                            setQuantityPerUnitInput(event.target.value)
                          }
                          className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300/90 bg-white/90 px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                          required
                        />
                      </label>
                    ) : null}

                    <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-zinc-200/60 bg-white/40 px-3 py-2 hover:bg-zinc-200/40 dark:border-zinc-600/80 dark:bg-zinc-800/30 dark:hover:bg-zinc-700/40">
                      <input
                        id="product-is-combo-input"
                        name="isCombo"
                        type="checkbox"
                        checked={isComboProductInput}
                        onChange={(event) =>
                          setIsComboProductInput(event.target.checked)
                        }
                        className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                      />
                      <span className="text-sm font-semibold leading-snug text-zinc-700 dark:text-zinc-300">
                        Es combo
                      </span>
                    </label>

                    {isComboProductInput ? (
                      <div className="flex min-h-0 w-full flex-col gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50/90 p-3 md:p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Componentes del combo
                        </p>
                        <div className="max-h-[250px] min-h-0 space-y-3 overflow-y-auto overflow-x-hidden pr-1 [scrollbar-width:thin]">
                          <div className="flex w-full flex-col gap-2">
                            <input
                              id="combo-component-search-input"
                              name="comboComponentSearch"
                              type="text"
                              value={comboComponentSearchInput}
                              onChange={(event) => {
                                const nextQuery = event.target.value;
                                setComboComponentSearchInput(nextQuery);
                                const normalizedQuery =
                                  nextQuery.trim().toLowerCase();
                                const firstMatch = productList
                                  .filter(
                                    (product) =>
                                      product.id !== resolvedEditingId,
                                  )
                                  .filter(
                                    (product) =>
                                      comboComponentsInput[product.id] ===
                                      undefined,
                                  )
                                  .find((product) =>
                                    product.name
                                      .toLowerCase()
                                      .includes(
                                        normalizedQuery.length > 0
                                          ? normalizedQuery
                                          : "",
                                      ),
                                  );
                                setComboComponentSelectedId(
                                  firstMatch?.id ?? "",
                                );
                                setComboComponentWarningMessage("");
                              }}
                              className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-sm dark:bg-zinc-800"
                              placeholder="Buscar producto..."
                            />
                            <select
                              id="combo-component-select-input"
                              name="comboComponentSelectedId"
                              value={comboComponentSelectedId}
                              onChange={(event) =>
                                setComboComponentSelectedId(event.target.value)
                              }
                              className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-sm dark:bg-zinc-800"
                            >
                              <option value="">Seleccionar producto</option>
                              {productList
                                .filter(
                                  (product) =>
                                    product.id !== resolvedEditingId,
                                )
                                .filter(
                                  (product) =>
                                    comboComponentsInput[product.id] ===
                                    undefined,
                                )
                                .filter((product) =>
                                  product.name
                                    .toLowerCase()
                                    .includes(
                                      comboComponentSearchInput
                                        .trim()
                                        .toLowerCase(),
                                    ),
                                )
                                .map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.sku.trim().length > 0
                                      ? `${product.name} (${product.sku})`
                                      : product.name}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleAddComboComponent}
                              disabled={comboComponentSelectedId.length === 0}
                              className="w-full rounded-lg border border-zinc-300 bg-white/90 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                            >
                              Agregar
                            </button>
                          </div>
                          {comboComponentWarningMessage.length > 0 ? (
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                              {comboComponentWarningMessage}
                            </p>
                          ) : null}
                          <div className="space-y-1">
                            {Object.entries(comboComponentsInput).map(
                              ([productId, quantity]) => {
                                const product = productList.find(
                                  (catalogProduct) =>
                                    catalogProduct.id === productId,
                                );
                                const labelLine =
                                  product
                                    ? product.sku.trim().length > 0
                                      ? `${product.name} (${product.sku})`
                                      : product.name
                                    : "Producto";
                                return (
                                  <div
                                    key={productId}
                                    className="flex w-full min-w-0 flex-col gap-2 border-b border-zinc-200/70 py-2.5 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3 lg:gap-4"
                                  >
                                    <div className="min-w-0 flex-[1_1_65%] sm:max-w-[70%] sm:pr-2">
                                      <span
                                        className="block truncate text-left text-sm text-zinc-700 lg:text-base dark:text-zinc-300"
                                        title={labelLine}
                                      >
                                        {labelLine}
                                      </span>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
                                      <input
                                        id={`combo-component-quantity-${productId}`}
                                        name={`comboComponentQuantity-${productId}`}
                                        type="number"
                                        min={0.0001}
                                        step="0.0001"
                                        value={quantity}
                                        onChange={(event) =>
                                          setComboComponentsInput((previous) => ({
                                            ...previous,
                                            [productId]: event.target.value,
                                          }))
                                        }
                                        className="w-24 min-w-22 shrink-0 rounded-md border border-zinc-300 bg-white/90 px-3 py-2 text-sm tabular-nums lg:min-w-24 dark:bg-zinc-800"
                                        aria-label="Cantidad por combo"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setComboComponentsInput((previous) => {
                                            const next = { ...previous };
                                            delete next[productId];
                                            return next;
                                          })
                                        }
                                        className="shrink-0 whitespace-nowrap rounded-md border border-zinc-300 bg-white/90 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-red-950/40"
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-zinc-200/80 bg-white/90 px-5 pt-4 pb-4 dark:border-zinc-700/80 dark:bg-zinc-900/95">
              {formErrorMessage.length > 0 ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {formErrorMessage}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingProductForm ||
                    isUploadingProductImage ||
                    isCreateSubmitBlockedByImage
                  }
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {isSavingProductForm ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <BarcodeCameraScanner
        isOpen={isBarcodeCameraScannerOpen}
        onClose={() => setIsBarcodeCameraScannerOpen(false)}
        onDecoded={(decodedSku) => setProductSkuInput(decodedSku)}
      />
    </>
  );
}
