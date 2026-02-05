/**
 * Toast Component
 *
 * Individual toast notification with:
 * - Animated entry/exit
 * - Icon based on type
 * - Optional title
 * - Dismissible
 * - Optional action button
 * - Progress bar for auto-dismiss
 */

import { Show, createSignal, onMount, onCleanup, createMemo } from 'solid-js';
import type { Notification } from '../stores/notification.store';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const typeStyles = {
  success: {
    container: 'bg-status-success-bg border-accent-success',
    icon: 'text-accent-success',
    progress: 'bg-accent-success',
  },
  error: {
    container: 'bg-status-danger-bg border-accent-danger',
    icon: 'text-accent-danger',
    progress: 'bg-accent-danger',
  },
  warning: {
    container: 'bg-status-warning-bg border-accent-warning',
    icon: 'text-accent-warning',
    progress: 'bg-accent-warning',
  },
  info: {
    container: 'bg-status-info-bg border-accent-primary',
    icon: 'text-accent-primary',
    progress: 'bg-accent-primary',
  },
} as const;

const iconPaths = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
} as const;

export function Toast(props: ToastProps) {
  const [progress, setProgress] = createSignal(100);
  const [isExiting, setIsExiting] = createSignal(false);
  let intervalId: number | undefined;

  const styles = createMemo(() => typeStyles[props.notification.type]);

  onMount(() => {
    // Animate progress bar
    if (props.notification.duration && props.notification.duration > 0) {
      const startTime = Date.now();
      const duration = props.notification.duration;

      intervalId = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const percent = (remaining / duration) * 100;
        setProgress(percent);

        if (remaining === 0) {
          clearInterval(intervalId);
        }
      }, 50);
    }
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      props.onDismiss(props.notification.id);
    }, 300); // Match animation duration
  };

  const handleAction = () => {
    props.notification.action?.onClick();
    handleDismiss();
  };

  return (
    <div
      class={`relative transform overflow-hidden rounded-lg border shadow-lg transition-all duration-300 ease-out ${styles().container} ${isExiting() ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'} min-w-[320px] max-w-md`}
      role="alert"
    >
      <div class="flex gap-3 p-4">
        {/* Icon */}
        <div class="flex-shrink-0">
          <svg
            class={`h-6 w-6 ${styles().icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d={iconPaths[props.notification.type]}
            />
          </svg>
        </div>

        {/* Content */}
        <div class="min-w-0 flex-1">
          <Show when={props.notification.title}>
            <p class="mb-1 text-sm font-semibold text-text-primary">
              {props.notification.title}
            </p>
          </Show>
          <p class="break-words text-sm text-text-secondary">
            {props.notification.message}
          </p>

          {/* Action Button */}
          <Show when={props.notification.action}>
            <button
              onClick={handleAction}
              class="mt-2 text-sm font-medium underline hover:no-underline"
            >
              {props.notification.action!.label}
            </button>
          </Show>
        </div>

        {/* Dismiss Button */}
        <Show when={props.notification.dismissible}>
          <button
            onClick={handleDismiss}
            class="text-text-tertiary flex-shrink-0 transition-colors hover:text-text-primary"
            aria-label="Dismiss notification"
          >
            <svg
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </Show>
      </div>

      {/* Progress Bar */}
      <Show
        when={props.notification.duration && props.notification.duration > 0}
      >
        <div class="bg-surface-secondary h-1">
          <div
            class={`h-full transition-all duration-100 ease-linear ${styles().progress}`}
            style={{ width: `${progress()}%` }}
          />
        </div>
      </Show>
    </div>
  );
}
