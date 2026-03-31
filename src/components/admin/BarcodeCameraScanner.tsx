"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { X } from "lucide-react";

export interface BarcodeCameraScannerProperties {
  isOpen: boolean;
  onClose: () => void;
  onDecoded: (decodedText: string) => void;
}

const BARCODE_SCANNER_ELEMENT_IDENTIFIER = "barcode-camera-scanner-region";

export function BarcodeCameraScanner({
  isOpen,
  onClose,
  onDecoded,
}: BarcodeCameraScannerProperties): ReactElement | null {
  const headingIdentifier = useId();
  const html5QrCodeInstanceReference = useRef<{
    stop: () => Promise<void>;
  } | null>(null);
  const [scannerErrorMessage, setScannerErrorMessage] = useState<string>("");
  const [isScannerStarting, setIsScannerStarting] = useState<boolean>(false);

  const stopScannerIfRunning = useCallback(async (): Promise<void> => {
    const scannerInstance = html5QrCodeInstanceReference.current;
    html5QrCodeInstanceReference.current = null;
    if (scannerInstance !== null) {
      try {
        await scannerInstance.stop();
      } catch {
        // ignore stop errors (e.g. already stopped)
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      void stopScannerIfRunning();
      setScannerErrorMessage("");
      setIsScannerStarting(false);
      return;
    }

    let isCancelled = false;

    async function startScanner(): Promise<void> {
      setScannerErrorMessage("");
      setIsScannerStarting(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (isCancelled) {
          return;
        }

        const html5QrCodeScanner = new Html5Qrcode(
          BARCODE_SCANNER_ELEMENT_IDENTIFIER,
        );

        await html5QrCodeScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 160 },
          },
          (decodedText) => {
            const trimmedText = decodedText.trim();
            if (trimmedText.length === 0) {
              return;
            }
            void html5QrCodeScanner.stop().then(() => {
              html5QrCodeInstanceReference.current = null;
              onDecoded(trimmedText);
              onClose();
            });
          },
          () => {
            // ignore per-frame scan misses
          },
        );

        if (isCancelled) {
          await html5QrCodeScanner.stop();
          return;
        }

        html5QrCodeInstanceReference.current = html5QrCodeScanner;
      } catch {
        if (!isCancelled) {
          setScannerErrorMessage(
            "No se pudo acceder a la cámara. Compruebe permisos o use otro navegador.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsScannerStarting(false);
        }
      }
    }

    void startScanner();

    return () => {
      isCancelled = true;
      void stopScannerIfRunning();
    };
  }, [isOpen, onClose, onDecoded, stopScannerIfRunning]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingIdentifier}
    >
      <div className="w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2
            id={headingIdentifier}
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Escanear código de barras
          </h2>
          <button
            type="button"
            onClick={() => {
              void stopScannerIfRunning();
              onClose();
            }}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Cerrar escáner"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative min-h-[220px] bg-zinc-950 p-4">
          <div
            id={BARCODE_SCANNER_ELEMENT_IDENTIFIER}
            className="mx-auto min-h-[200px] w-full max-w-lg overflow-hidden rounded-lg"
          />
          {isScannerStarting ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/90">
              Iniciando cámara…
            </p>
          ) : null}
        </div>
        {scannerErrorMessage.length > 0 ? (
          <p className="border-t border-zinc-200 px-4 py-3 text-sm text-red-600 dark:border-zinc-700 dark:text-red-400">
            {scannerErrorMessage}
          </p>
        ) : (
          <p className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Apunte al código de barras. Al detectarlo se rellenará el SKU y se
            cerrará esta ventana.
          </p>
        )}
      </div>
    </div>
  );
}
