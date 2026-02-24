import { Show } from 'solid-js';
import { Button } from '@/shared/ui/Button';
import type { ConfirmAction } from './types';

interface ConfirmActionModalProps {
  action: ConfirmAction;
  error: string | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmActionModal(props: ConfirmActionModalProps) {
  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="w-full max-w-md rounded-lg bg-bg-surface p-6 shadow-xl">
        <h2 class="mb-4 text-xl font-bold text-text-primary">Confirm Action</h2>

        <Show when={props.error}>
          <div class="bg-status-error-bg text-status-error-text mb-4 rounded-lg p-3 text-sm">
            {props.error}
          </div>
        </Show>

        <p class="mb-6 text-text-secondary">{props.action.message}</p>

        <div class="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={props.onClose}
            disabled={props.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={props.onConfirm}
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? 'Processing...' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}
