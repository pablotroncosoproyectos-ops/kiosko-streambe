"use client";

import type { Dispatch, ReactElement, SetStateAction } from "react";
import { BarcodeCameraScanner } from "@/components/admin/BarcodeCameraScanner";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import type { Product } from "@/types/database";
import type {
  CartItem,
  CatalogBrowseMode,
  RecentSaleHistoryRecord,
  SaleHistoryTab,
  SelectedPaymentMethod,
} from "../types";
import { CloseCashModal } from "./CloseCashModal";
import { LowStockAllModal } from "./LowStockAllModal";
import { QuickLoadModal } from "./QuickLoadModal";
import { SaleModal } from "./SaleModal";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { StockToolsModal } from "./StockToolsModal";

export interface ModalsContainerProps {
  isSaleModalOpen: boolean;
  saleModalBackdropVisible: boolean;
  closeSaleModal: () => void;
  scannerInputReference: React.RefObject<HTMLInputElement | null>;
  scannedBarcode: string;
  setScannedBarcode: Dispatch<SetStateAction<string>>;
  onScannerSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  setIsBarcodeCameraScannerOpen: Dispatch<SetStateAction<boolean>>;
  scanFeedbackMessage: string;
  errorMessage: string;
  isSessionMissingError: boolean;
  handleGoToOpenSessionFlow: () => void;
  selectedPaymentMethod: SelectedPaymentMethod;
  setSelectedPaymentMethod: Dispatch<SetStateAction<SelectedPaymentMethod>>;
  handleFinalizeSale: () => Promise<void>;
  isSubmittingSale: boolean;
  saleItemsList: CartItem[];
  isSaleHistoryPanelOpen: boolean;
  setIsSaleHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
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
  saleHistoryTab: SaleHistoryTab;
  setSaleHistoryTab: Dispatch<SetStateAction<SaleHistoryTab>>;

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
  setIsStockToolsModalOpen: Dispatch<SetStateAction<boolean>>;
  openCreateProductModal: () => void;
  productsCatalog: Product[];
  openStockAdjustmentModal: (product: Product) => void;

  isCreateProductModalOpen: boolean;
  setIsCreateProductModalOpen: Dispatch<SetStateAction<boolean>>;
  loadProductsCatalog: () => Promise<void>;

  isCloseCashModalOpen: boolean;
  closeCloseCashModal: () => void;
  isLoadingCashSummary: boolean;
  cashSummaryPayload: {
    sessionIdentifier: string;
    sessionType: string;
    openingBalance: number;
    expensesTotal: number;
    cashSalesTotal: number;
    expectedCashBalance: number;
  } | null;
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

  isLowStockAllModalOpen: boolean;
  setIsLowStockAllModalOpen: Dispatch<SetStateAction<boolean>>;
  lowStockModalSlice: Product[];
  lowStockModalPageIndex: number;
  setLowStockModalPageIndex: Dispatch<SetStateAction<number>>;
  lowStockModalTotalPages: number;

  isBarcodeCameraScannerOpen: boolean;
  tryAddProductBySku: (rawSku: string) => void;
}

export function ModalsContainer(props: ModalsContainerProps): ReactElement {
  const {
    isSaleModalOpen,
    saleModalBackdropVisible,
    closeSaleModal,
    scannerInputReference,
    scannedBarcode,
    setScannedBarcode,
    onScannerSubmit,
    setIsBarcodeCameraScannerOpen,
    scanFeedbackMessage,
    errorMessage,
    isSessionMissingError,
    handleGoToOpenSessionFlow,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    handleFinalizeSale,
    isSubmittingSale,
    saleItemsList,
    isSaleHistoryPanelOpen,
    setIsSaleHistoryPanelOpen,
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
    saleHistoryTab,
    setSaleHistoryTab,
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
    setIsStockToolsModalOpen,
    openCreateProductModal,
    productsCatalog,
    openStockAdjustmentModal,
    isCreateProductModalOpen,
    setIsCreateProductModalOpen,
    loadProductsCatalog,
    isCloseCashModalOpen,
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
    isLowStockAllModalOpen,
    setIsLowStockAllModalOpen,
    lowStockModalSlice,
    lowStockModalPageIndex,
    setLowStockModalPageIndex,
    lowStockModalTotalPages,
    isBarcodeCameraScannerOpen,
    tryAddProductBySku,
  } = props;

  return (
    <>
      {isSaleModalOpen ? (
        <SaleModal
          saleModalBackdropVisible={saleModalBackdropVisible}
          onClose={closeSaleModal}
          scannerInputReference={scannerInputReference}
          scannedBarcode={scannedBarcode}
          setScannedBarcode={setScannedBarcode}
          onScannerSubmit={onScannerSubmit}
          onOpenBarcodeCameraScanner={() => setIsBarcodeCameraScannerOpen(true)}
          scanFeedbackMessage={scanFeedbackMessage}
          errorMessage={errorMessage}
          isSessionMissingError={isSessionMissingError}
          onGoToOpenSessionFlow={handleGoToOpenSessionFlow}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          onFinalizeSale={handleFinalizeSale}
          isSubmittingSale={isSubmittingSale}
          saleItemsList={saleItemsList}
          isSaleHistoryPanelOpen={isSaleHistoryPanelOpen}
          setIsSaleHistoryPanelOpen={setIsSaleHistoryPanelOpen}
          isLoadingProductsCatalog={isLoadingProductsCatalog}
          pagedCartItems={pagedCartItems}
          totalSaleAmount={totalSaleAmount}
          onUpdateSaleItemQuantity={updateSaleItemQuantity}
          onToggleSaleItemUseCostPrice={toggleSaleItemUseCostPrice}
          onRemoveSaleItem={removeSaleItem}
          cartPageIndex={cartPageIndex}
          cartTotalPages={cartTotalPages}
          setCartPageIndex={setCartPageIndex}
          recentSalesForActiveHistoryTab={recentSalesForActiveHistoryTab}
          saleHistoryTab={saleHistoryTab}
          setSaleHistoryTab={setSaleHistoryTab}
        />
      ) : null}

      {isQuickLoadModalOpen ? (
        <QuickLoadModal
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
        isOpen={isStockToolsModalOpen}
        onClose={() => setIsStockToolsModalOpen(false)}
        onOpenCreateProduct={openCreateProductModal}
        productsCatalog={productsCatalog}
        onSelectProductForAdjustment={(product) => {
          openStockAdjustmentModal(product);
          setIsStockToolsModalOpen(false);
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
          setIsStockToolsModalOpen(false);
          await loadProductsCatalog();
        }}
        overlayZClass="z-56"
      />

      <CloseCashModal
        isOpen={isCloseCashModalOpen}
        onClose={closeCloseCashModal}
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

      <LowStockAllModal
        isOpen={isLowStockAllModalOpen}
        onClose={() => setIsLowStockAllModalOpen(false)}
        lowStockModalSlice={lowStockModalSlice}
        lowStockModalPageIndex={lowStockModalPageIndex}
        setLowStockModalPageIndex={setLowStockModalPageIndex}
        lowStockModalTotalPages={lowStockModalTotalPages}
      />

      <BarcodeCameraScanner
        isOpen={isBarcodeCameraScannerOpen}
        onClose={() => setIsBarcodeCameraScannerOpen(false)}
        onDecoded={(decodedText) => {
          setScannedBarcode(decodedText);
          tryAddProductBySku(decodedText);
        }}
      />
    </>
  );
}
