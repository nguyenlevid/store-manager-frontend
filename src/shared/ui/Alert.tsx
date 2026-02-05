import { Alert as KobalteAlert } from '@kobalte/core/alert';
import { type JSX, Show, splitProps } from 'solid-js';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: JSX.Element;
  class?: string;
}

const variantStyles: Record<AlertVariant, { container: string; icon: string }> =
  {
    info: {
      container:
        'bg-status-info-bg border-accent-primary text-status-info-text',
      icon: 'text-accent-primary',
    },
    success: {
      container:
        'bg-status-success-bg border-accent-success text-status-success-text',
      icon: 'text-accent-success',
    },
    warning: {
      container:
        'bg-status-warning-bg border-accent-warning text-status-warning-text',
      icon: 'text-accent-warning',
    },
    error: {
      container:
        'bg-status-danger-bg border-accent-danger text-status-danger-text',
      icon: 'text-accent-danger',
    },
  };

const iconPaths: Record<AlertVariant, string> = {
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning:
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

export function Alert(props: AlertProps) {
  const [local, others] = splitProps(props, [
    'variant',
    'title',
    'children',
    'class',
  ]);

  const variant = local.variant || 'info';
  const styles = variantStyles[variant];

  const baseStyles = 'rounded-lg border p-4 flex gap-3';
  const computedClass = `${baseStyles} ${styles.container} ${local.class || ''}`;

  return (
    <KobalteAlert class={computedClass} {...others}>
      <div class="flex-shrink-0">
        <svg
          class={`h-5 w-5 ${styles.icon}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d={iconPaths[variant]}
          />
        </svg>
      </div>
      <div class="flex-1">
        <Show when={local.title}>
          <h3 class="mb-1 font-medium">{local.title}</h3>
        </Show>
        <div class="text-sm">{local.children}</div>
      </div>
    </KobalteAlert>
  );
}
