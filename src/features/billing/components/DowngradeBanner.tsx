/**
 * DowngradeBanner
 *
 * Persistent banner displayed when:
 * - Pending auto-downgrade exists (grace period warning)
 * - Storehouses are locked after a downgrade
 *
 * Admin sees "Review & complete" actions.
 * Non-admins see "Contact your admin" notice.
 */

import { Show, type Component, createMemo } from 'solid-js';
import type { PendingDowngrade } from '../types/billing.types';

interface DowngradeBannerProps {
  /** Pending downgrade info (null if none) */
  pendingDowngrade: PendingDowngrade | null;
  /** Number of locked storehouses */
  lockedStorehouseCount: number;
  /** Whether the current user is an admin */
  isAdmin: boolean;
  /** Navigate to billing page */
  onNavigateToBilling?: () => void;
}

export const DowngradeBanner: Component<DowngradeBannerProps> = (props) => {
  const showBanner = createMemo(
    () => props.pendingDowngrade || props.lockedStorehouseCount > 0
  );

  const daysRemaining = createMemo(() => {
    if (!props.pendingDowngrade) return 0;
    const end = new Date(props.pendingDowngrade.gracePeriodEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });

  const tierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      free: 'Free',
      pro: 'Pro',
      enterprise: 'Enterprise',
    };
    return labels[tier] ?? tier;
  };

  return (
    <Show when={showBanner()}>
      <div class="bg-bg-warning/10 border-border-warning flex items-center justify-between gap-4 border px-4 py-3">
        <div class="flex min-w-0 items-center gap-3">
          {/* Warning icon */}
          <svg
            class="text-text-warning h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>

          <div class="min-w-0 text-sm text-text-primary">
            {/* Pending auto-downgrade */}
            <Show
              when={props.pendingDowngrade && !props.pendingDowngrade.executed}
            >
              <span class="font-medium">
                Switching to {tierLabel(props.pendingDowngrade!.targetPlan)} at
                next renewal
              </span>
              <span class="text-text-secondary">
                {' '}
                — {daysRemaining()} day(s) remaining.{' '}
                <Show
                  when={props.isAdmin}
                  fallback="Contact your admin to resolve."
                >
                  Review your plan or upgrade to cancel.
                </Show>
              </span>
            </Show>

            {/* Executed downgrade with locked storehouses */}
            <Show
              when={
                (!props.pendingDowngrade || props.pendingDowngrade.executed) &&
                props.lockedStorehouseCount > 0
              }
            >
              <span class="font-medium">
                {props.lockedStorehouseCount} storehouse(s) locked
              </span>
              <span class="text-text-secondary">
                {' '}
                due to plan downgrade.{' '}
                <Show
                  when={props.isAdmin}
                  fallback="Contact your admin to unlock."
                >
                  Upgrade your plan to unlock them.
                </Show>
              </span>
            </Show>
          </div>
        </div>

        <Show when={props.isAdmin && props.onNavigateToBilling}>
          <button
            class="text-text-brand flex-shrink-0 whitespace-nowrap text-sm font-medium hover:underline"
            onClick={props.onNavigateToBilling}
          >
            Go to Billing →
          </button>
        </Show>
      </div>
    </Show>
  );
};
