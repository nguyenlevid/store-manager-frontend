/**
 * UpgradePrompt
 *
 * Inline banner shown when a user hits a limit or tries to use
 * a gated feature. Can also be used as a blocking overlay.
 *
 * @example
 * <UpgradePrompt
 *   feature="transfers"
 *   message="Upgrade to Pro to use inter-storehouse transfers."
 * />
 */

import { Show } from 'solid-js';
import { A } from '@solidjs/router';
import { Button } from '@/shared/ui';
import type { FeatureFlag, LimitDimension } from '../types/billing.types';
import {
  hasFeature,
  isWithinLimit,
  formatUsage,
} from '../store/subscription.store';

interface UpgradePromptProps {
  /** Feature flag that is blocked */
  feature?: FeatureFlag;
  /** Limit dimension that is exceeded */
  limit?: LimitDimension;
  /** Custom message */
  message?: string;
  /** Whether to hide when the gate is passing (default: true) */
  hideWhenAllowed?: boolean;
}

export function UpgradePrompt(props: UpgradePromptProps) {
  const shouldShow = () => {
    if (props.hideWhenAllowed === false) return true;

    if (props.feature) return !hasFeature(props.feature);
    if (props.limit) return !isWithinLimit(props.limit);
    return true;
  };

  const defaultMessage = () => {
    if (props.feature) {
      return `This feature is not available on your current plan.`;
    }
    if (props.limit) {
      return `You've reached the limit (${formatUsage(props.limit)}). Upgrade to increase your capacity.`;
    }
    return 'Upgrade your plan to unlock this feature.';
  };

  return (
    <Show when={shouldShow()}>
      <div class="border-accent-primary/30 bg-accent-primary/5 flex items-center gap-4 rounded-lg border p-4">
        <div class="flex-1">
          <p class="text-sm font-medium text-text-primary">
            {props.message || defaultMessage()}
          </p>
        </div>
        <A href="/billing">
          <Button variant="primary" size="sm">
            Go to Billing →
          </Button>
        </A>
      </div>
    </Show>
  );
}

/**
 * FeatureGate — conditionally renders children or shows upgrade prompt.
 *
 * @example
 * <FeatureGate feature="transfers">
 *   <TransferForm />
 * </FeatureGate>
 */
export function FeatureGate(props: {
  feature?: FeatureFlag;
  limit?: LimitDimension;
  message?: string;
  children: any;
}) {
  const isAllowed = () => {
    if (props.feature) return hasFeature(props.feature);
    if (props.limit) return isWithinLimit(props.limit);
    return true;
  };

  return (
    <Show
      when={isAllowed()}
      fallback={
        <UpgradePrompt
          feature={props.feature}
          limit={props.limit}
          message={props.message}
        />
      }
    >
      {props.children}
    </Show>
  );
}
