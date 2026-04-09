"use client";

import {
  AlertTriangle,
  Banknote,
  Clock,
  LayoutGrid,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import type { ReactElement } from "react";
import { useDashboardSession } from "@/components/layout/dashboard-session-context";
import { ModalsContainer } from "./components/ModalsContainer";
import { OperadorSessionGridSkeleton } from "./components/OperadorSessionGridSkeleton";
import { useOperadorDashboard } from "./useOperadorDashboard";

// Constantes de estilo unificadas
const OPERADOR_CARD_BASE_CLASS =
  "flex min-h-[280px] w-full flex-col items-center justify-center gap-4 rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-900";

const OPERADOR_CARD_HOVER_CLASS =
  "hover:-translate-y-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] active:scale-95";

const OperadorDashboardPage = (): ReactElement => {
  const dashboard = useOperadorDashboard();
  const { userRole, isProfileReady } = useDashboardSession();
  
  const hasLowStock = dashboard.lowStockProductsList.length > 0;
  const showHistorialCard = isProfileReady && userRole === "ADMIN";

  /**
   * LOGICA DE GRID ACTUALIZADA:
   * 1. Si NO hay stock bajo: Se usan 2 columnas (tarjetas grandes) y max-w-5xl.
   * 2. Si HAY stock bajo: Se usan 4 columnas (tarjetas compactas) para dar espacio a la alerta abajo.
   */
  const dashboardGridClassName = !hasLowStock 
    ? "grid-cols-1 md:grid-cols-2 lg:max-w-5xl" 
    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col bg-slate-50 [-ms-overflow-style:none] [scrollbar-width:none] dark:bg-zinc-950 [&::-webkit-scrollbar]:hidden">
      {dashboard.operatorCashSessionState === "loading" ? (
        <OperadorSessionGridSkeleton />
      ) : dashboard.operatorCashSessionState === "noSession" ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-white/25 bg-white/85 p-8 shadow-2xl ring-1 ring-black/5 dark:border-white/10 dark:bg-zinc-900/80 md:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-amber-100/80 p-4 dark:bg-amber-950/50">
                <Banknote className="size-12 text-amber-800 dark:text-amber-200" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Abrir caja</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Ingrese el saldo inicial para comenzar.</p>
              <label className="mt-6 w-full text-left">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Saldo inicial</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={dashboard.openingBalanceInitialInput}
                  onChange={(e) => dashboard.setOpeningBalanceInitialInput(e.target.value)}
                  placeholder="0,00"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              <button
                type="button"
                onClick={() => void dashboard.handleOpenCashSessionSubmit()}
                className="mt-6 w-full rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white hover:bg-amber-700"
              >
                Abrir caja
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col min-h-0 gap-4 py-4 md:py-6">
          {/* Header del Dashboard */}
          <div className="flex w-full shrink-0 items-start justify-between gap-3 px-4 md:px-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="rounded-lg bg-white p-2 shadow-sm dark:bg-zinc-900">
                <ShoppingCart className="size-6 text-zinc-700 dark:text-zinc-200" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 md:text-2xl">Punto de venta</h1>
                  {dashboard.isBreakActive && (
                    <span className="inline-flex items-center rounded-full bg-blue-600/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 animate-recreo-pulse dark:bg-blue-500/20 dark:text-blue-300">
                      RECREO INICIADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-sm">Turno activo — gestiona las operaciones</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void dashboard.openCloseCashModal()}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
            >
              <Banknote className="size-4" />
              Cerrar caja
            </button>
          </div>

          {/* Contenedor de Tarjetas con Scroll */}
          <div className="flex flex-1 flex-col items-center overflow-y-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 items-center">
              
              {/* Grid de las 4 Tarjetas principales */}
              <div className={`grid w-full gap-6 md:gap-8 justify-center ${dashboardGridClassName}`}>
                <button
                  type="button"
                  onClick={() => dashboard.setIsRecreoModalOpen(true)}
                  className={`${OPERADOR_CARD_BASE_CLASS} ${OPERADOR_CARD_HOVER_CLASS} hover:border-blue-400`}
                >
                  <Clock className="size-16 text-blue-600 dark:text-blue-500" />
                  <span className="text-xl font-bold">Turno y recreo</span>
                  <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">Gestión de recreos y tiempo restante.</p>
                </button>

                <button
                  type="button"
                  onClick={() => dashboard.setIsQuickLoadModalOpen(true)}
                  className={`${OPERADOR_CARD_BASE_CLASS} ${OPERADOR_CARD_HOVER_CLASS} hover:border-orange-400`}
                >
                  <LayoutGrid className="size-16 text-orange-600 dark:text-orange-500" />
                  <span className="text-xl font-bold">Venta Libre</span>
                  <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">Venta por categorías e imágenes.</p>
                </button>

                <button
                  type="button"
                  onClick={() => dashboard.openStockToolsModal()}
                  className={`${OPERADOR_CARD_BASE_CLASS} ${OPERADOR_CARD_HOVER_CLASS} hover:border-amber-400`}
                >
                  <Warehouse className="size-16 text-amber-600 dark:text-amber-500" />
                  <span className="text-xl font-bold">Ajuste de stock</span>
                  <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">Altas y correcciones de inventario.</p>
                </button>

                {showHistorialCard && (
                  <button
                    type="button"
                    onClick={() => dashboard.setIsSaleModalOpen(true)}
                    className={`${OPERADOR_CARD_BASE_CLASS} ${OPERADOR_CARD_HOVER_CLASS} hover:border-emerald-400`}
                  >
                    <ShoppingCart className="size-16 text-emerald-600 dark:text-emerald-500" />
                    <span className="text-xl font-bold">Historial</span>
                    <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">Consulta de ventas y movimientos.</p>
                  </button>
                )}
              </div>

              {/* Tarjeta de Alerta de Stock (Ancha, debajo de las 4 compactas) */}
              {hasLowStock && (
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => dashboard.openLowStockDetailModal()}
                    className={`${OPERADOR_CARD_BASE_CLASS} ${OPERADOR_CARD_HOVER_CLASS} min-h-[180px] border-red-200 bg-red-50/30 hover:border-red-400 dark:bg-red-950/10`}
                  >
                    <AlertTriangle className="size-14 text-red-600 dark:text-red-500" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Alerta de stock</span>
                      <p className="max-w-2xl px-2 text-sm text-zinc-500 dark:text-zinc-400">Hay productos por terminarse. Clic para ver el detalle.</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ModalsContainer con todas las props del dashboard */}
      <ModalsContainer
        isSaleModalOpen={dashboard.isSaleModalOpen}
        saleModalBackdropVisible={dashboard.saleModalBackdropVisible}
        closeSaleModal={dashboard.closeSaleModal}
        setIsBarcodeCameraScannerOpen={dashboard.setIsBarcodeCameraScannerOpen}
        selectedPaymentMethod={dashboard.selectedPaymentMethod}
        setSelectedPaymentMethod={dashboard.setSelectedPaymentMethod}
        handleFinalizeSale={dashboard.handleFinalizeSale}
        isSubmittingSale={dashboard.isSubmittingSale}
        saleItemsList={dashboard.saleItemsList}
        isLoadingProductsCatalog={dashboard.isLoadingProductsCatalog}
        pagedCartItems={dashboard.pagedCartItems}
        totalSaleAmount={dashboard.totalSaleAmount}
        updateSaleItemQuantity={dashboard.updateSaleItemQuantity}
        toggleSaleItemUseCostPrice={dashboard.toggleSaleItemUseCostPrice}
        removeSaleItem={dashboard.removeSaleItem}
        cartPageIndex={dashboard.cartPageIndex}
        cartTotalPages={dashboard.cartTotalPages}
        setCartPageIndex={dashboard.setCartPageIndex}
        recentSalesForActiveHistoryTab={dashboard.recentSalesForActiveHistoryTab}
        recentSalesHistoryPageSlice={dashboard.recentSalesHistoryPageSlice}
        historyTotalRowCount={dashboard.recentSalesForActiveHistoryTab.length}
        saleHistoryTab={dashboard.saleHistoryTab}
        setSaleHistoryTab={dashboard.setSaleHistoryTab}
        historyPageIndex={dashboard.historyPageIndex}
        historyTotalPages={dashboard.historyTotalPages}
        setHistoryPageIndex={dashboard.setHistoryPageIndex}
        downloadHistorySaleTicketPdf={dashboard.downloadHistorySaleTicketPdf}
        historyTicketPdfLoadingSaleId={dashboard.historyTicketPdfLoadingSaleId}
        downloadHistoryTabReportPdf={dashboard.downloadHistoryTabReportPdf}
        historyReportPdfLoading={dashboard.historyReportPdfLoading}
        isQuickLoadModalOpen={dashboard.isQuickLoadModalOpen}
        quickLoadModalBackdropVisible={dashboard.quickLoadModalBackdropVisible}
        closeQuickLoadModal={dashboard.closeQuickLoadModal}
        catalogBrowseMode={dashboard.catalogBrowseMode}
        setCatalogBrowseMode={dashboard.setCatalogBrowseMode}
        quickLoadSelectedCategory={dashboard.quickLoadSelectedCategory}
        setQuickLoadSelectedCategory={dashboard.setQuickLoadSelectedCategory}
        catalogUniqueCategoryList={dashboard.catalogUniqueCategoryList}
        quickLoadSearchQuery={dashboard.quickLoadSearchQuery}
        setQuickLoadSearchQuery={dashboard.setQuickLoadSearchQuery}
        quickLoadDisplayedProducts={dashboard.quickLoadDisplayedProducts}
        addProductFromQuickLoadWithLineSubtotal={dashboard.addProductFromQuickLoadWithLineSubtotal}
        saleNotesInput={dashboard.saleNotesInput}
        setSaleNotesInput={dashboard.setSaleNotesInput}
        isStockToolsModalOpen={dashboard.isStockToolsModalOpen}
        stockToolsModalInstanceKey={dashboard.stockToolsModalInstanceKey}
        stockToolsModalBackdropVisible={dashboard.stockToolsModalBackdropVisible}
        closeStockToolsModal={dashboard.closeStockToolsModal}
        closeStockToolsModalImmediately={dashboard.closeStockToolsModalImmediately}
        openCreateProductModal={dashboard.openCreateProductModal}
        productsCatalog={dashboard.productsCatalog}
        openStockAdjustmentModal={dashboard.openStockAdjustmentModal}
        isCreateProductModalOpen={dashboard.isCreateProductModalOpen}
        setIsCreateProductModalOpen={dashboard.setIsCreateProductModalOpen}
        loadProductsCatalog={dashboard.loadProductsCatalog}
        isCloseCashModalOpen={dashboard.isCloseCashModalOpen}
        closeCashModalInstanceKey={dashboard.closeCashModalInstanceKey}
        canEditOpeningBalance={userRole === "ADMIN"}
        closeCloseCashModal={dashboard.closeCloseCashModal}
        isLoadingCashSummary={dashboard.isLoadingCashSummary}
        cashSummaryPayload={dashboard.cashSummaryPayload}
        openingBalanceCashInput={dashboard.openingBalanceCashInput}
        setOpeningBalanceCashInput={dashboard.setOpeningBalanceCashInput}
        expensesCashInput={dashboard.expensesCashInput}
        setExpensesCashInput={dashboard.setExpensesCashInput}
        physicalCashInput={dashboard.physicalCashInput}
        setPhysicalCashInput={dashboard.setPhysicalCashInput}
        shiftClosingNotesInput={dashboard.shiftClosingNotesInput}
        setShiftClosingNotesInput={dashboard.setShiftClosingNotesInput}
        closeCashErrorMessage={dashboard.closeCashErrorMessage}
        isSubmittingCloseCash={dashboard.isSubmittingCloseCash}
        handleSubmitCloseCash={dashboard.handleSubmitCloseCash}
        stockAdjustmentProduct={dashboard.stockAdjustmentProduct}
        stockAdjustmentModalBackdropVisible={dashboard.stockAdjustmentModalBackdropVisible}
        closeStockAdjustmentModal={dashboard.closeStockAdjustmentModal}
        stockAdjustmentNewStockInput={dashboard.stockAdjustmentNewStockInput}
        setStockAdjustmentNewStockInput={dashboard.setStockAdjustmentNewStockInput}
        stockAdjustmentReasonInput={dashboard.stockAdjustmentReasonInput}
        setStockAdjustmentReasonInput={dashboard.setStockAdjustmentReasonInput}
        stockAdjustmentIsReduction={dashboard.stockAdjustmentIsReduction}
        stockAdjustmentErrorMessage={dashboard.stockAdjustmentErrorMessage}
        canSubmitStockAdjustment={dashboard.canSubmitStockAdjustment}
        isSavingStockAdjustment={dashboard.isSavingStockAdjustment}
        handleStockAdjustmentSubmit={dashboard.handleStockAdjustmentSubmit}
        isLowStockDetailModalOpen={dashboard.isLowStockDetailModalOpen}
        lowStockDetailModalBackdropVisible={dashboard.lowStockDetailModalBackdropVisible}
        closeLowStockDetailModal={dashboard.closeLowStockDetailModal}
        lowStockProductsList={dashboard.lowStockProductsList}
        isBarcodeCameraScannerOpen={dashboard.isBarcodeCameraScannerOpen}
        tryAddProductBySku={dashboard.tryAddProductBySku}
        isRecreoModalOpen={dashboard.isRecreoModalOpen}
        recreoModalBackdropVisible={dashboard.recreoModalBackdropVisible}
        closeRecreoModal={dashboard.closeRecreoModal}
        recreoBreakDisplay={dashboard.recreoBreakDisplay}
        breakDurationMinutes={dashboard.breakDurationMinutes}
        setBreakDurationMinutes={dashboard.setBreakDurationMinutes}
        isStartingRecreoSession={dashboard.isStartingRecreoSession}
        recreoStartErrorMessage={dashboard.recreoStartErrorMessage}
        remainingTimeSeconds={dashboard.remainingTimeSeconds}
        isBreakActive={dashboard.isBreakActive}
        handleStartBreak={dashboard.handleStartBreak}
        handleCancelBreak={dashboard.handleCancelBreak}
      />
    </main>
  );
};

export default OperadorDashboardPage;