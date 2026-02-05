import { Navigate, useLocation } from '@solidjs/router';
import { Show, type JSX } from 'solid-js';
import { isAuthenticated, isLoading } from '../store/session.store';

interface ProtectedRouteProps {
  children: JSX.Element;
}

/**
 * Route guard for authenticated routes
 *
 * Shows loading state while checking session.
 * Redirects to /login if not authenticated.
 */
export function ProtectedRoute(props: ProtectedRouteProps) {
  const location = useLocation();

  return (
    <Show
      when={!isLoading()}
      fallback={
        <div class="flex h-screen items-center justify-center">
          <div class="text-gray-500">Loading...</div>
        </div>
      }
    >
      <Show
        when={isAuthenticated()}
        fallback={
          <Navigate
            href={`/login?redirect=${encodeURIComponent(location.pathname)}`}
          />
        }
      >
        {props.children}
      </Show>
    </Show>
  );
}
