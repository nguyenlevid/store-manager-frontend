import { Navigate, useLocation } from '@solidjs/router';
import { Show, type JSX } from 'solid-js';
import { isAuthenticated, isLoading, getUser } from '../store/session.store';
import { getBusiness, isBusinessLoaded } from '@/shared/stores/business.store';

interface ProtectedRouteProps {
  children: JSX.Element;
}

/**
 * Route guard for authenticated routes
 *
 * Shows loading state while checking session.
 * Redirects to /login if not authenticated.
 * Redirects to /signup if user has no business (edge case for legacy accounts).
 */
export function ProtectedRoute(props: ProtectedRouteProps) {
  const location = useLocation();

  /**
   * Check if user has a business.
   * Uses the user's `business` field from the session (set at login/signup).
   * Also checks the business store as a secondary signal.
   */
  const hasBusiness = () => {
    const u = getUser();
    // User has a business field set from the JWT/session
    if (u?.business) return true;
    // Or business store has loaded data
    if (isBusinessLoaded() && getBusiness()) return true;
    return false;
  };

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
        <Show when={hasBusiness()} fallback={<Navigate href="/signup" />}>
          {props.children}
        </Show>
      </Show>
    </Show>
  );
}
