"use client";

import type { Dispatch, ReactElement, SetStateAction } from "react";
import { BarcodeCameraScanner } from "@/components/admin/BarcodeCameraScanner";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import type { Product } from "@/types/database";
import type {
  CartItem,
  CatalogBrowseMode,
  OperatorCloseCashSummaryPayload,
  RecentSaleHistoryRecord,
  SaleHistoryTab,
  SelectedPaymentMethod,
} from "../types";
import { CloseCashModal } from "./CloseCashModal";
import { LowStockDetailModal } from "./LowStockDetailModal";
import { QuickLoadModal } from "./QuickLoadModal";
import { RecreoModal } from "./RecreoModal";
import { SaleModal } from "./SaleModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockToolsModal } from "./StockToolsModal";

export interface ModalsContainerProps {
  isSaleModalOpen: boolean;
  saleModalBackdropVisible: boolean;
  closeSaleModal: () => void;
  setIsBarcodeCameraScannerOpen: Dispatch<SetStateAction<boolean>>;
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  handleFinalizeSale: () => Promise<void>;
  isSubmittingSale: boolean;
  saleItemsList: CartItem[];
  isLoadingProductsCatalog: boolean;
  pagedCartItems: CartItem[];
  totalSaleAmount: number;
  updateSaleItemQuantity: (productIdentifier: string, quantity: number) => void;
  toggleSaleItemUseCostPrice: (productIdentifier: string) => void;
  removeSaleItem: (productIdentifier: string) => void;
  cartPageIndex: number;
  cartTotalPages: number;
  setCartPageIndex: Dispatch<SetStateAction<number>>;
  recentSalesForActiveHistoryTab: RecentSaleHistoryRecord[];
  recentSalesHistoryPageSlice: RecentSaleHistoryRecord[];
  historyTotalRowCount: number;
  saleHistoryTab: SaleHistoryTab;
  setSaleHistoryTab: Dispatch<SetStateAction<SaleHistoryTab>>;
  historyPageIndex: number;
  historyTotalPages: number;
  setHistoryPageIndex: Dispatch<SetStateAction<number>>;
  downloadHistorySaleTicketPdf: (record: RecentSaleHistoryRecord) => void;
  historyTicketPdfLoadingSaleId: string | null;
  downloadHistoryTabReportPdf: () => void;
  historyReportPdfLoading: boolean;

  isQuickLoadModalOpen: boolean;
  quickLoadModalBackdropVisible: boolean;
  closeQuickLoadModal: () => void;
  catalogBrowseMode: CatalogBrowseMode;
  setCatalogBrowseMode: Dispatch<SetStateAction<CatalogBrowseMode>>;
  quickLoadSelectedCategory: string | "ALL";
  setQuickLoadSelectedCategory: Dispatch<SetStateAction<string | "ALL">>;
  catalogUniqueCategoryList: string[];
  quickLoadSearchQuery: string;
  setQuickLoadSearchQuery: Dispatch<SetStateAction<string>>;
  quickLoadDisplayedProducts: Product[];
  addProductFromQuickLoadWithLineSubtotal: (
    product: Product,
    quantity: number,
    lineSubtotal: number,
  ) => void;
  saleNotesInput: string;
  setSaleNotesInput: Dispatch<SetStateAction<string>>;

  isStockToolsModalOpen: boolean;
  stockToolsModalInstanceKey: number;
  stockToolsModalBackdropVisible: boolean;
  closeStockToolsModal: () => void;
  closeStockToolsModalImmediately: () => void;
  openCreateProductModal: () => void;
  productsCatalog: Product[];
  openStockAdjustmentModal: (product: Product) => void;

  isCreateProductModalOpen: boolean;
  setIsCreateProductModalOpen: Dispatch<SetStateAction<boolean>>;
  loadProductsCatalog: () => Promise<void>;

  isCloseCashModalOpen: boolean;
  closeCashModalInstanceKey: number;
  canEditOpeningBalance: boolean;
  closeCloseCashModal: () => void;
  isLoadingCashSummary: boolean;
  cashSummaryPayload: OperatorCloseCashSummaryPayload | null;
  openingBalanceCashInput: string;
  setOpeningBalanceCashInput: Dispatch<SetStateAction<string>>;
  expensesCashInput: string;
  setExpensesCashInput: Dispatch<SetStateAction<string>>;
  physicalCashInput: string;
  setPhysicalCashInput: Dispatch<SetStateAction<string>>;
  shiftClosingNotesInput: string;
  setShiftClosingNotesInput: Dispatch<SetStateAction<string>>;
  closeCashErrorMessage: string;
  isSubmittingCloseCash: boolean;
  handleSubmitCloseCash: () => Promise<void>;

  stockAdjustmentProduct: Product | null;
  stockAdjustmentModalBackdropVisible: boolean;
  closeStockAdjustmentModal: () => void;
  stockAdjustmentNewStockInput: string;
  setStockAdjustmentNewStockInput: Dispatch<SetStateAction<string>>;
  stockAdjustmentReasonInput: string;
  setStockAdjustmentReasonInput: Dispatch<SetStateAction<string>>;
  stockAdjustmentIsReduction: boolean;
  stockAdjustmentErrorMessage: string;
  canSubmitStockAdjustment: boolean;
  isSavingStockAdjustment: boolean;
  handleStockAdjustmentSubmit: () => Promise<void>;

  isLowStockDetailModalOpen: boolean;
  lowStockDetailModalBackdropVisible: boolean;
  closeLowStockDetailModal: () => void;
  lowStockProductsList: Product[];

  isBarcodeCameraScannerOpen: boolean;
  tryAddProductBySku: (rawSku: string) => void;

  isRecreoModalOpen: boolean;
  recreoModalBackdropVisible: boolean;
  closeRecreoModal: () => void;
  recreoBreakDisplay: {
    recreoSessionsStartedTodayCount: number;
    displayBreakIndex: number;
    maxBreaksPerDay: number;
  } | null;
  breakDurationMinutes: number;
  setBreakDurationMinutes: Dispatch<SetStateAction<number>>;
  isStartingRecreoSession: boolean;
  recreoStartErrorMessage: string;
  remainingTimeSeconds: number;
  /** Recreo activo; también habilita el escáner en Carga rápida. */
  isBreakActive: boolean;
  handleStartBreak: () => void | Promise<void>;
  handleCancelBreak: () => void;
}

export function ModalsContainer(props: ModalsContainerProps): ReactElement {
  const {
    isSaleModalOpen,
    saleModalBackdropVisible,
    closeSaleModal,
    setIsBarcodeCameraScannerOpen,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleFinalizeSale,
    isSubmittingSale,
    saleItemsList,
    isLoadingProductsCatalog,
    pagedCartItems,
    totalSaleAmount,
    updateSaleItemQuantity,
    toggleSaleItemUseCostPrice,
    removeSaleItem,
    cartPageIndex,
    cartTotalPages,
    setCartPageIndex,
    recentSalesForActiveHistoryTab,
    recentSalesHistoryPageSlice,
    historyTotalRowCount,
    saleHistoryTab,
    setSaleHistoryTab,
    historyPageIndex,
    historyTotalPages,
    setHistoryPageIndex,
    downloadHistorySaleTicketPdf,
    historyTicketPdfLoadingSaleId,
    downloadHistoryTabReportPdf,
    historyReportPdfLoading,
    isQuickLoadModalOpen,
    quickLoadModalBackdropVisible,
    closeQuickLoadModal,
    catalogBrowseMode,
    setCatalogBrowseMode,
    quickLoadSelectedCategory,
    setQuickLoadSelectedCategory,
    catalogUniqueCategoryList,
    quickLoadSearchQuery,
    setQuickLoadSearchQuery,
    quickLoadDisplayedProducts,
    addProductFromQuickLoadWithLineSubtotal,
    saleNotesInput,
    setSaleNotesInput,
    isStockToolsModalOpen,
    stockToolsModalInstanceKey,
    stockToolsModalBackdropVisible,
    closeStockToolsModal,
    closeStockToolsModalImmediately,
    openCreateProductModal,
    productsCatalog,
    openStockAdjustmentModal,
    isCreateProductModalOpen,
    setIsCreateProductModalOpen,
    loadProductsCatalog,
    isCloseCashModalOpen,
    closeCashModalInstanceKey,
    canEditOpeningBalance,
    closeCloseCashModal,
    isLoadingCashSummary,
    cashSummaryPayload,
    openingBalanceCashInput,
    setOpeningBalanceCashInput,
    expensesCashInput,
    setExpensesCashInput,
    physicalCashInput,
    setPhysicalCashInput,
    shiftClosingNotesInput,
    setShiftClosingNotesInput,
    closeCashErrorMessage,
    isSubmittingCloseCash,
    handleSubmitCloseCash,
    stockAdjustmentProduct,
    stockAdjustmentModalBackdropVisible,
    closeStockAdjustmentModal,
    stockAdjustmentNewStockInput,
    setStockAdjustmentNewStockInput,
    stockAdjustmentReasonInput,
    setStockAdjustmentReasonInput,
    stockAdjustmentIsReduction,
    stockAdjustmentErrorMessage,
    canSubmitStockAdjustment,
    isSavingStockAdjustment,
    handleStockAdjustmentSubmit,
    isLowStockDetailModalOpen,
    lowStockDetailModalBackdropVisible,
    closeLowStockDetailModal,
    lowStockProductsList,
    isBarcodeCameraScannerOpen,
    tryAddProductBySku,
    isRecreoModalOpen,
    recreoModalBackdropVisible,
    closeRecreoModal,
    recreoBreakDisplay,
    breakDurationMinutes,
    setBreakDurationMinutes,
    isStartingRecreoSession,
    recreoStartErrorMessage,
    remainingTimeSeconds,
    isBreakActive,
    handleStartBreak,
    handleCancelBreak,
  } = props;

  return (
    <>
      {isSaleModalOpen ? (
        <SaleModal
          saleModalBackdropVisible={saleModalBackdropVisible}
          onClose={closeSaleModal}
          recentSalesForActiveHistoryTab={recentSalesForActiveHistoryTab}
          recentSalesHistoryPageSlice={recentSalesHistoryPageSlice}
          historyTotalRowCount={historyTotalRowCount}
          saleHistoryTab={saleHistoryTab}
          setSaleHistoryTab={setSaleHistoryTab}
          historyPageIndex={historyPageIndex}
          historyTotalPages={historyTotalPages}
          setHistoryPageIndex={setHistoryPageIndex}
          onDownloadHistorySaleTicketPdf={downloadHistorySaleTicketPdf}
          historyTicketPdfLoadingSaleId={historyTicketPdfLoadingSaleId}
          onDownloadHistoryTabReportPdf={downloadHistoryTabReportPdf}
          historyReportPdfLoading={historyReportPdfLoading}
        />
      ) : null}

      {isRecreoModalOpen ? (
        <RecreoModal
          recreoModalBackdropVisible={recreoModalBackdropVisible}
          onClose={closeRecreoModal}
          recreoBreakDisplay={recreoBreakDisplay}
          breakDurationMinutes={breakDurationMinutes}
          setBreakDurationMinutes={setBreakDurationMinutes}
          isStartingRecreoSession={isStartingRecreoSession}
          recreoStartErrorMessage={recreoStartErrorMessage}
          remainingTimeSeconds={remainingTimeSeconds}
          isBreakActive={isBreakActive}
          onStartBreak={handleStartBreak}
          onCancelBreak={handleCancelBreak}
        />
      ) : null}

      {isQuickLoadModalOpen ? (
        <QuickLoadModal
          isBreakActive={isBreakActive}
          quickLoadModalBackdropVisible={quickLoadModalBackdropVisible}
          onClose={closeQuickLoadModal}
          catalogBrowseMode={catalogBrowseMode}
          setCatalogBrowseMode={setCatalogBrowseMode}
          quickLoadSelectedCategory={quickLoadSelectedCategory}
          setQuickLoadSelectedCategory={setQuickLoadSelectedCategory}
          catalogUniqueCategoryList={catalogUniqueCategoryList}
          quickLoadSearchQuery={quickLoadSearchQuery}
          setQuickLoadSearchQuery={setQuickLoadSearchQuery}
          quickLoadDisplayedProducts={quickLoadDisplayedProducts}
          productsForBarcodeLookup={productsCatalog}
          isLoadingProductsCatalog={isLoadingProductsCatalog}
          onAddProductFromQuickLoad={addProductFromQuickLoadWithLineSubtotal}
          totalSaleAmount={totalSaleAmount}
          saleItemsList={saleItemsList}
          pagedCartItems={pagedCartItems}
          cartPageIndex={cartPageIndex}
          cartTotalPages={cartTotalPages}
          setCartPageIndex={setCartPageIndex}
          onUpdateSaleItemQuantity={updateSaleItemQuantity}
          onToggleSaleItemUseCostPrice={toggleSaleItemUseCostPrice}
          onRemoveSaleItem={removeSaleItem}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          saleNotesInput={saleNotesInput}
          setSaleNotesInput={setSaleNotesInput}
          onFinalizeSale={handleFinalizeSale}
          isSubmittingSale={isSubmittingSale}
        />
      ) : null}

      <StockToolsModal
        key={`stock-tools-${stockToolsModalInstanceKey}`}
        isOpen={isStockToolsModalOpen}
        stockToolsModalBackdropVisible={stockToolsModalBackdropVisible}
        onClose={closeStockToolsModal}
        onOpenCreateProduct={openCreateProductModal}
        productsCatalog={productsCatalog}
        onSelectProductForAdjustment={(product) => {
          closeStockToolsModalImmediately();
          openStockAdjustmentModal(product);
        }}
      />

      <ProductFormModal
        isOpen={isCreateProductModalOpen}
        onClose={() => setIsCreateProductModalOpen(false)}
        mode="create"
        initialProduct={null}
        editingProductId={null}
        productList={productsCatalog}
        onSuccess={async () => {
          closeStockToolsModalImmediately();
          await loadProductsCatalog();
        }}
        overlayZClass="z-56"
      />

      <CloseCashModal
        key={`close-cash-${closeCashModalInstanceKey}`}
        isOpen={isCloseCashModalOpen}
        onClose={closeCloseCashModal}
        canEditOpeningBalance={canEditOpeningBalance}
        isLoadingCashSummary={isLoadingCashSummary}
        cashSummaryPayload={cashSummaryPayload}
        openingBalanceCashInput={openingBalanceCashInput}
        setOpeningBalanceCashInput={setOpeningBalanceCashInput}
        expensesCashInput={expensesCashInput}
        setExpensesCashInput={setExpensesCashInput}
        physicalCashInput={physicalCashInput}
        setPhysicalCashInput={setPhysicalCashInput}
        shiftClosingNotesInput={shiftClosingNotesInput}
        setShiftClosingNotesInput={setShiftClosingNotesInput}
        closeCashErrorMessage={closeCashErrorMessage}
        isSubmittingCloseCash={isSubmittingCloseCash}
        onSubmit={handleSubmitCloseCash}
      />

      <StockAdjustmentModal
        product={stockAdjustmentProduct}
        stockAdjustmentModalBackdropVisible={stockAdjustmentModalBackdropVisible}
        onClose={closeStockAdjustmentModal}
        stockAdjustmentNewStockInput={stockAdjustmentNewStockInput}
        setStockAdjustmentNewStockInput={setStockAdjustmentNewStockInput}
        stockAdjustmentReasonInput={stockAdjustmentReasonInput}
        setStockAdjustmentReasonInput={setStockAdjustmentReasonInput}
        stockAdjustmentIsReduction={stockAdjustmentIsReduction}
        stockAdjustmentErrorMessage={stockAdjustmentErrorMessage}
        canSubmitStockAdjustment={canSubmitStockAdjustment}
        isSavingStockAdjustment={isSavingStockAdjustment}
        onSubmit={handleStockAdjustmentSubmit}
      />

      {isLowStockDetailModalOpen ? (
        <LowStockDetailModal
          lowStockDetailModalBackdropVisible={lowStockDetailModalBackdropVisible}
          onClose={closeLowStockDetailModal}
          lowStockProductsList={lowStockProductsList}
        />
      ) : null}

      <BarcodeCameraScanner
        isOpen={isBarcodeCameraScannerOpen}
        onClose={() => setIsBarcodeCameraScannerOpen(false)}
        onDecoded={(decodedText) => {
          tryAddProductBySku(decodedText);
        }}
      />
    </>
  );
}
