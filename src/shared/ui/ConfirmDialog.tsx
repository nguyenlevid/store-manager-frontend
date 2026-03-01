/**
 * ConfirmDialog
 *
 * A modal confirmation dialog that replaces browser `confirm()`.
 * Supports customisable title, message, button labels, and danger variant.
 */

import { Show, type Component, type JSX } from 'solid-js';
import { Button } from './Button';

export interface ConfirmDialogProps {
  /** Whether the dialog is visible */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog body — string or JSX */
  children: JSX.Element;
  /** Label for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Use danger styling for the confirm button */
  danger?: boolean;
  /** Disable the confirm button (e.g. while submitting) */
  isSubmitting?: boolean;
  /** Called when the user confirms */
  onConfirm: () => void;
  /** Called when the user cancels or clicks the backdrop */
  onCancel: () => void;
}

export const ConfirmDialog: Component<ConfirmDialogProps> = (props) => {
  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !props.isSubmitting)
            props.onCancel();
        }}
      >
        <div class="w-full max-w-md rounded-xl border border-border-default bg-bg-surface shadow-xl">
          {/* Header */}
          <div class="border-b border-border-default px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                {props.title}
              </h2>
              <button
                onClick={props.onCancel}
                disabled={props.isSubmitting}
                class="text-text-tertiary hover:bg-bg-muted rounded-md p-1 transition-colors hover:text-text-primary"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div class="px-6 py-4 text-sm leading-relaxed text-text-secondary">
            {props.children}
          </div>

          {/* Footer */}
          <div class="flex justify-end gap-3 border-t border-border-default px-6 py-4">
            <Button
              variant="outline"
              onClick={props.onCancel}
              disabled={props.isSubmitting}
            >
              {props.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={props.danger ? 'danger' : 'primary'}
              onClick={props.onConfirm}
              disabled={props.isSubmitting}
            >
              {props.isSubmitting
                ? 'Processing…'
                : (props.confirmLabel ?? 'Confirm')}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};
