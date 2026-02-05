import { type Component } from 'solid-js';
import type { StockStatus } from '../types/inventory.types';

interface StockStatusBadgeProps {
  status: StockStatus;
  quantity: number;
}

export const StockStatusBadge: Component<StockStatusBadgeProps> = (props) => {
  const statusConfig = () => {
    switch (props.status) {
      case 'in-stock':
        return {
          label: 'In Stock',
          bgColor: 'bg-status-success-bg',
          textColor: 'text-status-success-text',
          dotColor: 'bg-accent-success',
        };
      case 'low-stock':
        return {
          label: 'Low Stock',
          bgColor: 'bg-status-warning-bg',
          textColor: 'text-status-warning-text',
          dotColor: 'bg-accent-warning',
        };
      case 'out-of-stock':
        return {
          label: 'Out of Stock',
          bgColor: 'bg-status-danger-bg',
          textColor: 'text-status-danger-text',
          dotColor: 'bg-accent-danger',
        };
    }
  };

  return (
    <div class="flex items-center gap-2">
      <span
        class={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig().bgColor} ${statusConfig().textColor}`}
      >
        <span class={`h-1.5 w-1.5 rounded-full ${statusConfig().dotColor}`} />
        {statusConfig().label}
      </span>
      <span class="text-sm font-semibold text-text-primary">
        {props.quantity}
      </span>
    </div>
  );
};
