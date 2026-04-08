"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import type { Product } from "@/types/database";

type DetectedBarcode = { rawValue: string; format: string };

type BarcodeDetectorCtor = new (options?: {
  formats?: string[];
}) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

function getBarcodeDetectorConstructor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return typeof ctor === "function" ? ctor : null;
}

const DETECTOR_FORMATS: readonly string[] = [
  "qr_code",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "codabar",
];

/** Evita doble lectura del mismo c?digo (c?mara + pistola o frames seguidos). */
const SCAN_DEBOUNCE_MS = 900;
const GUN_INTERKEY_GAP_MS = 120;
const DETECT_INTERVAL_MS = 250;

export interface QuickLoadScannerSectionProps {
  isActive: boolean;
  modalVisible: boolean;
  productsForLookup: Product[];
  onAddProduct: (
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ) => void;
}

function findProductByScannedCode(
  products: Product[],
  raw: string,
): Product | null {
  const normalized = raw.trim();
  if (normalized.length === 0) {
    return null;
  }
  const exact = products.find((p) => p.sku.trim() === normalized);
  if (exact !== undefined) {
    return exact;
  }
  const lower = normalized.toLowerCase();
  return (
    products.find((p) => p.sku.trim().toLowerCase() === lower) ?? null
  );
}

export function QuickLoadScannerSection({
  isActive,
  modalVisible,
  productsForLookup,
  onAddProduct,
}: QuickLoadScannerSectionProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<number | null>(null);
  const lastProcessedRef = useRef<{ value: string; at: number }>({
    value: "",
    at: 0,
  });
  const gunBufferRef = useRef<string>("");
  const gunLastKeyRef = useRef<number>(0);

  const [cameraError, setCameraError] = useState<string>("");
  const [detectorSupported, setDetectorSupported] = useState<boolean | null>(
    null,
  );
  const [lastFeedback, setLastFeedback] = useState<string>("");

  /** Detiene tracks y timers sin actualizar estado (seguro dentro de efectos). */
  const releaseMediaTracks = useCallback((): void => {
    if (detectIntervalRef.current !== null) {
      window.clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    const video = videoRef.current;
    if (video !== null) {
      video.srcObject = null;
    }
    const stream = streamRef.current;
    if (stream !== null) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const processScannedValue = useCallback(
    (raw: string): void => {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        return;
      }
      const now = Date.now();
      if (
        trimmed === lastProcessedRef.current.value &&
        now - lastProcessedRef.current.at < SCAN_DEBOUNCE_MS
      ) {
        return;
      }

      const product = findProductByScannedCode(productsForLookup, trimmed);
      if (product === null) {
        setLastFeedback(`Sin coincidencia: ${trimmed}`);
        lastProcessedRef.current = { value: trimmed, at: now };
        return;
      }
      if (!product.isActive) {
        setLastFeedback(`Producto inactivo: ${product.name}`);
        lastProcessedRef.current = { value: trimmed, at: now };
        return;
      }

      onAddProduct(product, 1, product.price);
      setLastFeedback(`Agregado: ${product.name}`);
      lastProcessedRef.current = { value: trimmed, at: now };
    },
    [onAddProduct, productsForLookup],
  );

  useEffect(() => {
    if (!isActive || !modalVisible) {
      releaseMediaTracks();
      return;
    }

    const video = videoRef.current;
    if (video === null) {
      return;
    }

    let cancelled = false;

    void (async (): Promise<void> => {
      setCameraError("");
      const BarcodeDetectorClass = getBarcodeDetectorConstructor();
      setDetectorSupported(BarcodeDetectorClass !== null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "No se pudo abrir la c?mara";
        setCameraError(message);
        return;
      }

      if (BarcodeDetectorClass === null || cancelled) {
        return;
      }

      let detector: InstanceType<BarcodeDetectorCtor>;
      try {
        detector = new BarcodeDetectorClass({ formats: [...DETECTOR_FORMATS] });
      } catch {
        setDetectorSupported(false);
        return;
      }

      detectIntervalRef.current = window.setInterval(() => {
        if (cancelled || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          return;
        }
        void detector
          .detect(video)
          .then((barcodes: DetectedBarcode[]) => {
            if (barcodes.length === 0 || cancelled) {
              return;
            }
            const first = barcodes[0];
            if (first !== undefined && first.rawValue.length > 0) {
              processScannedValue(first.rawValue);
            }
          })
          .catch(() => {
            /* frame inv?lido */
          });
      }, DETECT_INTERVAL_MS);
    })();

    return () => {
      cancelled = true;
      releaseMediaTracks();
    };
  }, [isActive, modalVisible, processScannedValue, releaseMediaTracks]);

  useEffect(() => {
    if (!isActive || !modalVisible) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const now = Date.now();
      if (now - gunLastKeyRef.current > GUN_INTERKEY_GAP_MS) {
        gunBufferRef.current = "";
      }
      gunLastKeyRef.current = now;

      if (event.key === "Enter") {
        const code = gunBufferRef.current.trim();
        gunBufferRef.current = "";
        if (code.length > 0) {
          processScannedValue(code);
        }
        return;
      }

      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        gunBufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isActive, modalVisible, processScannedValue]);

  return (
    <section className="col-span-12 flex min-h-0 flex-1 flex-col bg-zinc-950 text-white">
      <div className="relative mx-auto flex min-h-[min(55vh,420px)] w-full max-w-lg flex-1 flex-col p-4 md:max-w-xl md:p-6">
        <div className="relative flex flex-1 overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-black shadow-inner ring-1 ring-white/10">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
            aria-label="Vista de c?mara para escanear c?digos"
          />
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-8"
            aria-hidden
          >
            <div className="relative aspect-square w-[min(72%,280px)] rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-blue-400/90 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-center text-sm">
          {cameraError.length > 0 ? (
            <p className="rounded-lg bg-red-950/80 px-3 py-2 text-red-200">
              {cameraError}
            </p>
          ) : null}
          {detectorSupported === false ? (
            <p className="text-amber-200/90">
              Este navegador no soporta BarcodeDetector. Usa la pistola lectora
              (USB/Bluetooth) o Chrome en Android/desktop.
            </p>
          ) : null}
          {lastFeedback.length > 0 ? (
            <p className="font-medium text-emerald-300">{lastFeedback}</p>
          ) : null}
          <p className="text-xs text-zinc-400">
            Enfoca el c?digo dentro del recuadro. Pistola: apunta fuera de
            campos de texto y presiona Enter al finalizar.
          </p>
        </div>
      </div>
    </section>
  );
}
