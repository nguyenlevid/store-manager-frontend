import { ErrorBoundary as SolidErrorBoundary } from 'solid-js';
import type { JSX, ParentProps } from 'solid-js';

interface AppErrorBoundaryProps extends ParentProps {
  /** Optional custom fallback. If omitted, a default error UI is rendered. */
  fallback?: (err: unknown, reset: () => void) => JSX.Element;
}

/**
 * Application-level error boundary.
 * Catches unhandled errors in the component tree and renders a recovery UI.
 */
export function AppErrorBoundary(props: AppErrorBoundaryProps) {
  const defaultFallback = (err: unknown, reset: () => void) => {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred';

    return (
      <div class="flex min-h-[50vh] items-center justify-center p-8">
        <div class="w-full max-w-md rounded-lg border border-border-default bg-bg-surface p-6 text-center shadow-lg">
          <div class="bg-status-error-subtle mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <svg
              class="text-status-error h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 class="mb-2 text-lg font-semibold text-text-primary">
            Something went wrong
          </h2>
          <p class="mb-4 text-sm text-text-secondary">{message}</p>
          <button
            onClick={reset}
            class="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-border-focus"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  };

  return (
    <SolidErrorBoundary fallback={props.fallback ?? defaultFallback}>
      {props.children}
    </SolidErrorBoundary>
  );
}
