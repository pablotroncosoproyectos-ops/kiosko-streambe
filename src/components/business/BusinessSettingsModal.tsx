"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react";
import { ImagePlus, Loader2, Save, Store, X } from "lucide-react";

import { persistBrandingToLocalCache } from "@/lib/brandingLocalCache";

interface BusinessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBusinessName: string;
  initialLogoUrl: string | null;
  onSaved: (next: { businessName: string; logoUrl: string | null }) => void;
}

interface BusinessSettingsApiResponse {
  businessSettings?: {
    businessName: string;
    logoUrl: string | null;
  };
  message?: string;
}

const MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-3 backdrop-blur-md dark:bg-zinc-950/55 md:p-6";

const MODAL_PANEL_CLASS =
  "flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/10 ring-1 ring-zinc-950/[0.04] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/[0.06]";

const CLOSE_BUTTON_CLASS =
  "shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200";

async function parseResponseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractServerErrorMessage(body: unknown, fallback: string): string {
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

export function BusinessSettingsModal({
  isOpen,
  onClose,
  initialBusinessName,
  initialLogoUrl,
  onSaved,
}: BusinessSettingsModalProps): ReactElement | null {
  const titleId = useId();
  const [businessName, setBusinessName] = useState<string>(initialBusinessName);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [selectedLogoPreviewUrl, setSelectedLogoPreviewUrl] = useState<string | null>(null);
  const [hasRequestedLogoRemoval, setHasRequestedLogoRemoval] =
    useState<boolean>(false);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputReference = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setBusinessName(initialBusinessName);
    setLogoUrl(initialLogoUrl);
    setSelectedLogoFile(null);
    setSelectedLogoPreviewUrl(null);
    setHasRequestedLogoRemoval(false);
    setIsSavingName(false);
    setIsUploadingLogo(false);
    setErrorMessage("");
    if (fileInputReference.current) {
      fileInputReference.current.value = "";
    }
  }, [initialBusinessName, initialLogoUrl, isOpen]);

  useEffect(() => {
    return () => {
      if (selectedLogoPreviewUrl) {
        URL.revokeObjectURL(selectedLogoPreviewUrl);
      }
    };
  }, [selectedLogoPreviewUrl]);

  const isBusy = isSavingName || isUploadingLogo;

  const resolvedPreviewUrl = useMemo(() => {
    if (
      typeof selectedLogoPreviewUrl === "string" &&
      selectedLogoPreviewUrl.trim().length > 0
    ) {
      return selectedLogoPreviewUrl;
    }
    return typeof logoUrl === "string" && logoUrl.trim().length > 0 ? logoUrl : null;
  }, [logoUrl, selectedLogoPreviewUrl]);

  const handleSaveBusinessName = useCallback(async (): Promise<void> => {
    setIsSavingName(true);
    setErrorMessage("");
    try {
      let nextLogoUrl = logoUrl;
      if (selectedLogoFile) {
        setIsUploadingLogo(true);
        const formData = new FormData();
        formData.set("file", selectedLogoFile);
        const uploadResponse = await fetch("/api/business-settings/upload-logo", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        const uploadBody = await parseResponseJsonSafe(uploadResponse);
        if (uploadResponse.status === 401) {
          window.location.assign("/login");
          return;
        }
        if (!uploadResponse.ok) {
          setErrorMessage(
            extractServerErrorMessage(uploadBody, "No se pudo subir el logo."),
          );
          return;
        }

        const uploadRecord =
          uploadBody && typeof uploadBody === "object"
            ? (uploadBody as Record<string, unknown>)
            : null;
        const uploadedLogoUrl =
          typeof uploadRecord?.logoUrl === "string" ? uploadRecord.logoUrl.trim() : "";
        if (uploadedLogoUrl.length > 0) {
          nextLogoUrl = uploadedLogoUrl;
          setLogoUrl(uploadedLogoUrl);
          setHasRequestedLogoRemoval(false);
        }
      }

      const shouldSendLogoValue =
        hasRequestedLogoRemoval || selectedLogoFile !== null;
      const response = await fetch("/api/business-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: businessName,
          ...(shouldSendLogoValue ? { logo_url: nextLogoUrl } : {}),
        }),
      });
      const body = await parseResponseJsonSafe(response);

      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setErrorMessage(
          extractServerErrorMessage(body, "No se pudo guardar el nombre del negocio."),
        );
        return;
      }

      const parsed = body as BusinessSettingsApiResponse;
      const next = parsed.businessSettings;
      if (next) {
        setBusinessName(next.businessName);
        setLogoUrl(next.logoUrl ?? null);
        onSaved({ businessName: next.businessName, logoUrl: next.logoUrl ?? null });
        try {
          persistBrandingToLocalCache(next.businessName, next.logoUrl ?? null);
        } catch {
          // Caché opcional para la pantalla de login sin sesión.
        }
      } else {
        onSaved({ businessName, logoUrl: nextLogoUrl });
        try {
          persistBrandingToLocalCache(businessName, nextLogoUrl);
        } catch {
          // Caché opcional para la pantalla de login sin sesión.
        }
      }

      setSelectedLogoFile(null);
      if (selectedLogoPreviewUrl) {
        URL.revokeObjectURL(selectedLogoPreviewUrl);
      }
      setSelectedLogoPreviewUrl(null);
      setHasRequestedLogoRemoval(false);
      if (fileInputReference.current) {
        fileInputReference.current.value = "";
      }
    } finally {
      setIsUploadingLogo(false);
      setIsSavingName(false);
    }
  }, [
    businessName,
    logoUrl,
    onSaved,
    selectedLogoFile,
    selectedLogoPreviewUrl,
    hasRequestedLogoRemoval,
  ]);

  const handleLogoFileChange = useCallback((file: File | null): void => {
    if (!file) {
      return;
    }
    setErrorMessage("");
    if (selectedLogoPreviewUrl) {
      URL.revokeObjectURL(selectedLogoPreviewUrl);
    }
    setSelectedLogoFile(file);
    setSelectedLogoPreviewUrl(URL.createObjectURL(file));
    setHasRequestedLogoRemoval(false);
  }, [selectedLogoPreviewUrl]);

  const handleRemoveSelectedLogo = useCallback((): void => {
    setSelectedLogoFile(null);
    if (selectedLogoPreviewUrl) {
      URL.revokeObjectURL(selectedLogoPreviewUrl);
    }
    setSelectedLogoPreviewUrl(null);
    setLogoUrl(null);
    setHasRequestedLogoRemoval(true);
    if (fileInputReference.current) {
      fileInputReference.current.value = "";
    }
  }, [selectedLogoPreviewUrl]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={MODAL_BACKDROP_CLASS}
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={MODAL_PANEL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
          <h2 id={titleId} className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Configuración del negocio
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={CLOSE_BUTTON_CLASS}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 pb-6 pt-2">
          {errorMessage.length > 0 ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Logo
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  {resolvedPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedPreviewUrl}
                      alt="Logo del negocio"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="size-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700">
                  {isUploadingLogo ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ImagePlus className="size-4" aria-hidden />
                  )}
                  <span>{isUploadingLogo ? "Subiendo…" : "Subir logo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputReference}
                    disabled={isBusy}
                    onChange={(event) => {
                      handleLogoFileChange(event.target.files?.[0] ?? null);
                    }}
                  />
                </label>
              </div>
              {resolvedPreviewUrl ? (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleRemoveSelectedLogo}
                    className="text-xs font-medium text-rose-600 underline underline-offset-2 transition-colors hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    Remover imagen
                  </button>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Formatos: JPG/PNG/WebP/GIF. Máx 5 MB.
              </p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Nombre
              </p>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  Nombre del negocio
                </span>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Ej: Kiosko Streambe"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  disabled={isBusy}
                />
              </label>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveBusinessName()}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSavingName ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" aria-hidden />
                  )}
                  Guardar
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

