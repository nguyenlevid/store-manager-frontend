/**
 * Toast Container
 *
 * Global container for all toast notifications.
 * Renders in a fixed position with proper z-index.
 * Automatically positions toasts and handles overflow.
 */

import { For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { notificationStore } from '../stores/notification.store';
import { Toast } from './Toast';

export function ToastContainer() {
  return (
    <Portal>
      <div
        class="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-3"
        aria-live="polite"
        aria-atomic="false"
      >
        <Show when={notificationStore.notifications().length > 0}>
          <For each={notificationStore.notifications()}>
            {(notification) => (
              <div class="pointer-events-auto">
                <Toast
                  notification={notification}
                  onDismiss={notificationStore.remove}
                />
              </div>
            )}
          </For>
        </Show>
      </div>
    </Portal>
  );
}
