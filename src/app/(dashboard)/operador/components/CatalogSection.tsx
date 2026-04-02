"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import type { ReactElement } from "react";
import type { Product } from "@/types/database";
import { formatArgentinaPesos } from "@/lib/currencyFormat";

export interface CatalogSectionProps {
  quickLoadDisplayedProducts: Product[];
  isLoadingProductsCatalog: boolean;
  onAddProductFromQuickLoad: (
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ) => void;
}

export function CatalogSection({
  quickLoadDisplayedProducts,
  isLoadingProductsCatalog,
  onAddProductFromQuickLoad,
}: CatalogSectionProps): ReactElement {
  return (
    <div className="flex-1 h-full min-h-0 overflow-y-auto p-3 md:p-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
      {quickLoadDisplayedProducts.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-12 dark:border-zinc-800 dark:bg-zinc-900/30">
          <p className="text-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {isLoadingProductsCatalog
              ? "Cargando catálogo de productos..."
              : "No se encontraron productos coincidentes."}
          </p>
        </div>
      ) : (
        /* GRID: 2 columnas fijas */
        <div className="grid grid-cols-2 gap-3 pb-4">
          {quickLoadDisplayedProducts.map((product) => (
            <div
              key={product.id}
              /* CAMBIO CLAVE SIN CONFIGURACIÓN:
                 Usamos [@media(max-height:800px)]:min-h-[220px] 
                 Esto fuerza que en la pantalla de 768px de alto, cada tarjeta mida al menos 220px.
                 Esa altura extra es la que "empuja" la 3ra fila hacia abajo para que solo veas 4.
              */
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-900/50 [@media(max-height:800px)]:min-h-[220px]"
            >
              {/* Imagen del Producto */}
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-contain p-1 transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-zinc-100 dark:bg-zinc-800/60">
                    <Camera className="size-6 text-zinc-400 opacity-50" />
                  </div>
                )}
              </div>

              {/* Detalles y Acción */}
              <div className="mt-2 flex flex-1 flex-col justify-between gap-2">
                <div className="space-y-0.5">
                  <h3 className="line-clamp-2 text-[11px] font-bold leading-tight text-zinc-900 dark:text-zinc-100">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      {formatArgentinaPesos(product.price)}
                    </p>
                    {product.isBulk && (
                      <span className="rounded-md bg-emerald-50 px-1 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Unidad
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onAddProductFromQuickLoad(product, 1, product.price)}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.97]"
                >
                  Añadir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}