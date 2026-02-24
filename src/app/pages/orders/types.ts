export type ModalMode =
  | 'create'
  | 'edit'
  | 'delete'
  | 'detail'
  | 'confirm-action'
  | null;

export interface ConfirmAction {
  type:
    | 'markDelivered'
    | 'completePayment'
    | 'completeTransaction'
    | 'cancelTransaction'
    | 'unmarkDelivered'
    | 'unmarkPayment';
  transactionId: string;
  message: string;
}

export interface FormItem {
  itemId: string;
  quantity: string;
  unitPrice: string;
}

export interface AdvancedFilters {
  clientId: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  priceMax: string;
  sortBy: 'createdAt' | 'totalPrice' | 'clientName';
  sortOrder: 'asc' | 'desc';
}

export interface OrderActionHandlers {
  showConfirmation: (action: ConfirmAction) => void;
  handleMarkPending: (transactionId: string) => Promise<void>;
  closeModal: () => void;
}

export type FormatCurrencyFn = (amount: number) => string;
export type FormatDateFn = (dateString?: string) => string;
