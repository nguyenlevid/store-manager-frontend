import { Button } from '@/shared/ui/Button';

interface OrderSelectionBarProps {
  selectedCount: number;
  printMode: 'report' | 'receipt';
  onClearSelection: () => void;
  onSetPrintMode: (mode: 'report' | 'receipt') => void;
  onPrint: () => void;
}

export function OrderSelectionBar(props: OrderSelectionBarProps) {
  return (
    <div class="bg-accent-primary/10 border-accent-primary/30 flex items-center justify-between rounded-lg border px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-text-primary">
          {props.selectedCount} order
          {props.selectedCount > 1 ? 's' : ''} selected
        </span>
        <Button variant="ghost" size="sm" onClick={props.onClearSelection}>
          Clear Selection
        </Button>
        {/* Print mode toggle */}
        <div class="bg-bg-secondary flex items-center gap-1 rounded-lg p-1">
          <button
            onClick={() => props.onSetPrintMode('report')}
            class={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              props.printMode === 'report'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => props.onSetPrintMode('receipt')}
            class={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              props.printMode === 'receipt'
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Receipt
          </button>
        </div>
      </div>
      <Button variant="primary" onClick={props.onPrint}>
        <svg
          class="mr-2 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print Receipts
      </Button>
    </div>
  );
}
