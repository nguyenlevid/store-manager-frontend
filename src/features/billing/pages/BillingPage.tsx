/**
 * BillingPage
 *
 * Shows current plan, usage summary, and plan comparison.
 * Admin users can change the plan.
 */

import {
  createResource,
  Show,
  For,
  createSignal,
  createEffect,
  onMount,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Alert,
  ConfirmDialog,
} from '@/shared/ui';
import {
  fetchSubscription,
  fetchPlans,
  changePlan,
  swapResources,
  resolveDowngrade,
  fetchPendingDowngrade,
  cancelPendingDowngrade,
  formatUsage,
  usagePercent,
  subscriptionStore,
} from '../store/subscription.store';
import type {
  PlanDefinition,
  PlanTier,
  LimitDimension,
  FeatureFlag,
  BillingCycle,
  Invoice,
} from '../types/billing.types';
import { isAdmin } from '@/shared/stores/permissions.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';
import { DowngradeModal } from '../components/DowngradeModal';
import { SwapModal } from '../components/SwapModal';
import { ResolveModal } from '../components/ResolveModal';
import { PaymentModal } from '../components/PaymentModal';
import {
  getInvoices,
  createPortalSession,
  cancelSubscription,
  createSubscription,
  retryPayment,
  reactivateSubscription,
} from '../api/stripe.api';
import { startTrial as startTrialApi } from '../api/billing.api';

// ============================================
// Constants
// ============================================

const DIMENSION_LABELS: Record<LimitDimension, string> = {
  storehouses: 'Storehouses',
  users: 'Team Members',
  items: 'Items',
  monthlyTransactions: 'Monthly Transactions',
};

const FEATURE_LABELS: Record<FeatureFlag, string> = {
  transfers: 'Inter-Storehouse Transfers',
  customRoles: 'Custom Roles & Permissions',
  advancedReports: 'Advanced Reports & Analytics',
};

const TIER_COLORS: Record<PlanTier, string> = {
  free: 'border-border-default',
  pro: 'border-accent-primary',
  enterprise: 'border-accent-secondary',
};

// ============================================
// Component
// ============================================

export default function BillingPage() {
  const navigate = useNavigate();

  // Admin-only: redirect non-admins immediately
  if (!isAdmin()) {
    navigate('/', { replace: true });
    return null;
  }

  const [usageResource, { refetch: refetchUsage }] = createResource(() =>
    fetchSubscription(true)
  );
  const [plansResource, { refetch: refetchPlans }] = createResource(() =>
    fetchPlans()
  );
  const [invoicesResource] = createResource(() => getInvoices(10));
  const [changingTo, setChangingTo] = createSignal<PlanTier | null>(null);
  const [error, setError] = createSignal('');
  const [showDowngradeModal, setShowDowngradeModal] = createSignal(false);
  const [downgradeTarget, setDowngradeTarget] = createSignal<PlanTier>('free');
  const [isDowngrading, setIsDowngrading] = createSignal(false);
  const [showSwapModal, setShowSwapModal] = createSignal(false);
  const [isSwapping, setIsSwapping] = createSignal(false);
  const [showResolveModal, setShowResolveModal] = createSignal(false);
  const [isResolving, setIsResolving] = createSignal(false);
  // Stripe-specific state
  const [billingCycle, setBillingCycle] = createSignal<BillingCycle>('monthly');
  const [showPaymentModal, setShowPaymentModal] = createSignal(false);
  const [paymentPlan, setPaymentPlan] =
    createSignal<Exclude<PlanTier, 'free'>>('pro');
  const [isOpeningPortal, setIsOpeningPortal] = createSignal(false);
  const [isCancelling, setIsCancelling] = createSignal(false);
  const TIER_ORDER: Record<PlanTier, number> = {
    free: 0,
    pro: 1,
    enterprise: 2,
  };

  const [isCancellingDowngrade, setIsCancellingDowngrade] = createSignal(false);
  // Confirm dialog state
  const [showDowngradeConfirm, setShowDowngradeConfirm] = createSignal(false);
  const [showCancelDowngradeConfirm, setShowCancelDowngradeConfirm] =
    createSignal(false);
  const [showCancelSubConfirm, setShowCancelSubConfirm] = createSignal(false);
  const [pendingDowngradeTier, setPendingDowngradeTier] =
    createSignal<PlanTier>('pro');

  // Paid → paid upgrade confirmation state
  const [showUpgradeConfirm, setShowUpgradeConfirm] = createSignal(false);
  const [upgradeTarget, setUpgradeTarget] =
    createSignal<Exclude<PlanTier, 'free'>>('enterprise');
  const [isUpgrading, setIsUpgrading] = createSignal(false);
  // If the saved-card auto-charge fails during upgrade, store the clientSecret
  // so PaymentModal can collect new card details without re-calling subscribe.
  const [upgradeClientSecret, setUpgradeClientSecret] = createSignal<
    string | null
  >(null);

  // Trial state
  const [isStartingTrial, setIsStartingTrial] = createSignal(false);

  // Retry payment state
  const [isRetrying, setIsRetrying] = createSignal(false);

  // Reactivate (undo cancel-at-period-end) state
  const [isReactivating, setIsReactivating] = createSignal(false);

  // Optimistic plan: tracks the plan the user just purchased, so
  // handleChangePlan knows the real tier even before the webhook fires
  // and the subscription store is refreshed from the server.
  const [optimisticPlan, setOptimisticPlan] = createSignal<PlanTier | null>(
    null
  );

  // Clear optimistic plan once the real store catches up
  createEffect(() => {
    const realPlan = subscriptionStore.usage()?.plan;
    if (realPlan && optimisticPlan() && realPlan === optimisticPlan()) {
      setOptimisticPlan(null);
    }
  });

  // Fetch pending downgrade info on mount
  onMount(() => {
    fetchPendingDowngrade();
  });

  const isDataLoaded = () =>
    !usageResource.loading && subscriptionStore.usage();

  const handleRetry = () => {
    refetchUsage();
    refetchPlans();
  };

  const handleChangePlan = async (tier: PlanTier) => {
    setError('');
    const currentPlan =
      optimisticPlan() ?? subscriptionStore.usage()?.plan ?? 'free';

    // Lower-tier plan change (schedule for renewal)
    if (TIER_ORDER[tier] < TIER_ORDER[currentPlan]) {
      // Paid → paid lower-tier change (e.g. enterprise → pro): show confirmation modal
      if (tier !== 'free' && currentPlan !== 'free') {
        if (subscriptionStore.pendingDowngrade()) {
          setError(
            'A plan change is already scheduled for renewal. Cancel it first to schedule a different one.'
          );
          return;
        }
        setPendingDowngradeTier(tier);
        setShowDowngradeConfirm(true);
        return;
      }

      // Paid → free downgrade: show DowngradeModal (resource selection)
      setDowngradeTarget(tier);
      setShowDowngradeModal(true);
      return;
    }

    // Upgrade to paid plan
    if (tier !== 'free' && TIER_ORDER[tier] > TIER_ORDER[currentPlan]) {
      if (currentPlan === 'free') {
        // Free → paid: need card input via Payment Element
        setPaymentPlan(tier as Exclude<PlanTier, 'free'>);
        setUpgradeClientSecret(null); // ensure no stale clientSecret
        setShowPaymentModal(true);
      } else {
        // Paid → paid upgrade (e.g. pro → enterprise): confirm first
        setUpgradeTarget(tier as Exclude<PlanTier, 'free'>);
        setShowUpgradeConfirm(true);
      }
      return;
    }

    // Same tier — cycle change (monthly ↔ annual)
    if (tier === currentPlan && tier !== 'free') {
      const currentCycle = subscriptionStore.usage()?.billingCycle;
      const selectedCycle = billingCycle();

      if (currentCycle === selectedCycle) {
        // Already on this exact plan+cycle — nothing to do
        return;
      }

      if (currentCycle === 'annual' && selectedCycle === 'monthly') {
        // Annual → monthly blocked
        setError(
          'Cannot switch from an annual plan to a monthly plan. Your annual subscription will auto-renew at the end of the current period.'
        );
        return;
      }

      // Monthly → annual: treated as an upgrade (immediate proration)
      setUpgradeTarget(tier as Exclude<PlanTier, 'free'>);
      setShowUpgradeConfirm(true);
      return;
    }
  };

  const handlePaymentSuccess = (purchasedPlan?: PlanTier) => {
    // Set optimistic plan so handleChangePlan sees the correct tier
    // even before the webhook fires and the store refreshes.
    const purchased = purchasedPlan ?? paymentPlan() ?? upgradeTarget();
    if (purchased) setOptimisticPlan(purchased);

    notificationStore.success(
      'Subscription updated! Your plan will activate shortly.'
    );
    refetchUsage();
    fetchPendingDowngrade(); // Upgrades clear pending downgrades
  };

  /**
   * Execute a paid → paid upgrade after the user confirms.
   * Calls the subscribe endpoint directly.  If Stripe auto-charges the
   * saved card, we're done.  If the card fails (rare), we fall back to
   * the PaymentModal so the user can provide a new card.
   */
  const executeUpgradeConfirm = async () => {
    const target = upgradeTarget();
    setShowUpgradeConfirm(false);
    setIsUpgrading(true);
    setError('');

    try {
      const res = (await createSubscription(target, billingCycle())) as any;

      if (res.alreadyActive) {
        // Payment was already processed but webhook hasn't fired yet
        notificationStore.info(
          'Your payment was already processed. Your plan will activate automatically — please wait a moment and refresh.'
        );
      } else if (res.clientSecret) {
        // Auto-charge failed — open PaymentModal with the existing
        // clientSecret so the user can enter new card details.
        setUpgradeClientSecret(res.clientSecret);
        setPaymentPlan(target);
        setShowPaymentModal(true);
      } else {
        // Saved card was charged successfully
        handlePaymentSuccess();
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsUpgrading(false);
    }
  };

  const executeDowngradeConfirm = async () => {
    const tier = pendingDowngradeTier();
    setShowDowngradeConfirm(false);
    setChangingTo(tier);
    setError('');
    try {
      await changePlan(tier, undefined, undefined, billingCycle());
      notificationStore.success(
        `Plan change to ${tier.charAt(0).toUpperCase() + tier.slice(1)} scheduled. It will take effect at the next renewal.`
      );
      fetchPendingDowngrade();
      refetchUsage();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      // If the backend requires resource selection (no Stripe sub), show DowngradeModal
      if (
        msg.includes('Must select exactly') ||
        msg.includes('Cannot change to this plan')
      ) {
        setDowngradeTarget(tier);
        setShowDowngradeModal(true);
      } else {
        setError(msg);
        notificationStore.error(msg);
      }
    } finally {
      setChangingTo(null);
    }
  };

  const handleCancelPendingDowngrade = async () => {
    setShowCancelDowngradeConfirm(true);
  };

  const executeCancelPendingDowngrade = async () => {
    setShowCancelDowngradeConfirm(false);
    setIsCancellingDowngrade(true);
    setError('');
    try {
      await cancelPendingDowngrade();
      notificationStore.success(
        'Scheduled plan change cancelled. Your current plan will continue.'
      );
      refetchUsage();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsCancellingDowngrade(false);
    }
  };

  const handleOpenPortal = async () => {
    setIsOpeningPortal(true);
    try {
      const { url } = await createPortalSession();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    setShowCancelSubConfirm(true);
  };

  const executeCancelSubscription = async () => {
    setShowCancelSubConfirm(false);
    setIsCancelling(true);
    try {
      await cancelSubscription();
      notificationStore.success(
        'Subscription will be cancelled at the end of the billing period.'
      );
      refetchUsage();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDowngradeConfirm = async (
    lockedStorehouseIds: string[],
    deactivatedUserIds: string[]
  ) => {
    setIsDowngrading(true);
    setError('');
    try {
      await changePlan(
        downgradeTarget(),
        lockedStorehouseIds,
        deactivatedUserIds
      );
      setShowDowngradeModal(false);
      notificationStore.success(`Plan changed to ${downgradeTarget()}`);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsDowngrading(false);
    }
  };

  const handleResolveConfirm = async (
    unlockStorehouseIds: string[],
    reactivateUserIds: string[]
  ) => {
    setIsResolving(true);
    setError('');
    try {
      await resolveDowngrade(
        unlockStorehouseIds.length > 0 ? unlockStorehouseIds : undefined,
        reactivateUserIds.length > 0 ? reactivateUserIds : undefined
      );
      setShowResolveModal(false);
      notificationStore.success('Resources unlocked successfully');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSwapConfirm = async (
    lockStorehouseIds: string[],
    unlockStorehouseIds: string[],
    deactivateUserIds: string[],
    reactivateUserIds: string[]
  ) => {
    setIsSwapping(true);
    setError('');
    try {
      await swapResources(
        lockStorehouseIds.length > 0 ? lockStorehouseIds : undefined,
        unlockStorehouseIds.length > 0 ? unlockStorehouseIds : undefined,
        deactivateUserIds.length > 0 ? deactivateUserIds : undefined,
        reactivateUserIds.length > 0 ? reactivateUserIds : undefined
      );
      setShowSwapModal(false);
      notificationStore.success('Resources swapped successfully');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleStartTrial = async () => {
    setIsStartingTrial(true);
    setError('');
    try {
      await startTrialApi();
      notificationStore.success('Your 30-day Pro trial has started!');
      refetchUsage();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsStartingTrial(false);
    }
  };

  const handleRetryPayment = async () => {
    setIsRetrying(true);
    setError('');
    try {
      const { url } = await retryPayment();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    setError('');
    try {
      await reactivateSubscription();
      notificationStore.success(
        'Subscription reactivated! It will continue at the next renewal.'
      );
      refetchUsage();
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      notificationStore.error(msg);
    } finally {
      setIsReactivating(false);
    }
  };

  /** Helper: days remaining in trial */
  const trialDaysRemaining = () => {
    const ends = subscriptionStore.usage()?.trialEndsAt;
    if (!ends) return 0;
    const diff = new Date(ends).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div class="space-y-6 py-8">
      {/* Page header */}
      <div>
        <h1 class="text-3xl font-bold text-text-primary">
          Billing & Subscription
        </h1>
        <p class="mt-2 text-sm text-text-secondary">
          Manage your plan, view usage, and unlock more features.
        </p>
      </div>

      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      {/* Trial Banner — offer trial when on free plan and trial not used */}
      <Show
        when={
          isAdmin() &&
          subscriptionStore.usage()?.plan === 'free' &&
          !subscriptionStore.usage()?.hasUsedTrial
        }
      >
        <div class="bg-accent-primary/5 rounded-lg border border-accent-primary px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div class="text-sm text-text-primary">
              <span class="font-medium">Try Pro for free!</span>
              <span class="text-text-secondary">
                {' '}
                Start a 30-day Pro trial — no credit card required.
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartTrial}
              disabled={isStartingTrial()}
            >
              {isStartingTrial() ? 'Starting…' : 'Start Free Trial'}
            </Button>
          </div>
        </div>
      </Show>

      {/* Active Trial Countdown */}
      <Show
        when={
          subscriptionStore.usage()?.status === 'trialing' &&
          subscriptionStore.usage()?.trialEndsAt
        }
      >
        <div class="bg-accent-primary/5 rounded-lg border border-accent-primary px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <svg
                class="h-5 w-5 flex-shrink-0 text-accent-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="text-sm text-text-primary">
                <span class="font-medium">Pro Trial Active</span>
                <span class="text-text-secondary">
                  {' '}
                  — {trialDaysRemaining()} day
                  {trialDaysRemaining() !== 1 ? 's' : ''} remaining (ends{' '}
                  {new Date(
                    subscriptionStore.usage()!.trialEndsAt!
                  ).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  ). Upgrade to keep your Pro features.
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setPaymentPlan('pro');
                setUpgradeClientSecret(null);
                setShowPaymentModal(true);
              }}
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      </Show>

      {/* Past Due — Payment Failed Banner */}
      <Show when={subscriptionStore.usage()?.status === 'past_due'}>
        <div class="bg-accent-danger/5 rounded-lg border border-accent-danger px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
              <svg
                class="h-5 w-5 flex-shrink-0 text-accent-danger"
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
              <div class="text-sm text-text-primary">
                <span class="font-medium text-accent-danger">
                  Payment failed
                </span>
                <span class="text-text-secondary">
                  {' '}
                  — Your last payment didn't go through. Please update your
                  payment method to keep your subscription active.
                </span>
              </div>
            </div>
            <Show when={isAdmin()}>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRetryPayment}
                disabled={isRetrying()}
                class="hover:bg-accent-danger/90 bg-accent-danger"
              >
                {isRetrying() ? 'Opening…' : 'Fix Payment'}
              </Button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Pending Downgrade Banner */}
      <Show when={subscriptionStore.pendingDowngrade()}>
        <div class="border-border-warning bg-bg-warning/10 rounded-lg border px-4 py-3">
          <div class="flex items-center justify-between gap-4">
            <div class="flex min-w-0 items-center gap-3">
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
              <div class="text-sm text-text-primary">
                <span class="font-medium">
                  Switching to{' '}
                  {subscriptionStore
                    .pendingDowngrade()!
                    .targetPlan.charAt(0)
                    .toUpperCase() +
                    subscriptionStore
                      .pendingDowngrade()!
                      .targetPlan.slice(1)}{' '}
                  at next renewal
                </span>
                <span class="text-text-secondary">
                  {' '}
                  — takes effect on{' '}
                  {new Date(
                    subscriptionStore.pendingDowngrade()!.gracePeriodEndsAt
                  ).toLocaleDateString()}
                  . Your current plan remains active until then.
                </span>
              </div>
            </div>
            <Show when={isAdmin()}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelPendingDowngrade}
                disabled={isCancellingDowngrade()}
              >
                {isCancellingDowngrade() ? 'Cancelling…' : 'Keep Current Plan'}
              </Button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Current Plan + Usage */}
      <Show when={!usageResource.loading} fallback={<LoadingSkeleton />}>
        <Show
          when={isDataLoaded()}
          fallback={
            <Card>
              <CardBody>
                <div class="py-8 text-center">
                  <p class="mb-4 text-text-secondary">
                    Unable to load subscription data. Please try again.
                  </p>
                  <Button variant="primary" onClick={handleRetry}>
                    Retry
                  </Button>
                </div>
              </CardBody>
            </Card>
          }
        >
          {(usage) => (
            <>
              {/* Usage Summary Card */}
              <Card>
                <CardHeader>
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-lg font-semibold text-text-primary">
                        Current Plan
                      </h2>
                      <p class="text-sm text-text-secondary">
                        You are on the{' '}
                        <span class="font-semibold capitalize text-accent-primary">
                          {optimisticPlan() ?? usage().plan}
                        </span>{' '}
                        plan
                        <Show when={usage().billingCycle}>
                          <span class="text-text-tertiary">
                            {' '}
                            (
                            {usage().billingCycle === 'annual'
                              ? 'Annual'
                              : 'Monthly'}
                            )
                          </span>
                        </Show>
                      </p>
                    </div>
                    <span
                      class={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        usage().status === 'active'
                          ? 'bg-status-success-bg text-status-success-text'
                          : 'bg-status-warning-bg text-status-warning-text'
                      }`}
                    >
                      {usage().status}
                    </span>
                  </div>
                </CardHeader>
                <CardBody>
                  {/* Billing Period Info */}
                  <Show
                    when={usage().plan !== 'free' && usage().currentPeriodEnd}
                  >
                    <div class="bg-bg-muted mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg px-4 py-3 text-sm">
                      <div>
                        <span class="text-text-tertiary">Next renewal: </span>
                        <span class="font-medium text-text-primary">
                          {new Date(
                            usage().currentPeriodEnd!
                          ).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <Show when={usage().billingCycle}>
                        <div>
                          <span class="text-text-tertiary">Cycle: </span>
                          <span class="font-medium capitalize text-text-primary">
                            {usage().billingCycle}
                          </span>
                        </div>
                      </Show>
                      <Show when={usage().canceledAt}>
                        <div class="flex items-center gap-3 text-accent-danger">
                          <div>
                            <span>Cancels on: </span>
                            <span class="font-medium">
                              {new Date(
                                usage().currentPeriodEnd!
                              ).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <Show when={isAdmin()}>
                            <button
                              class="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50"
                              onClick={handleReactivate}
                              disabled={isReactivating()}
                            >
                              {isReactivating()
                                ? 'Reactivating…'
                                : 'Undo Cancel'}
                            </button>
                          </Show>
                        </div>
                      </Show>
                      <Show when={usage().paymentMethod}>
                        <div>
                          <span class="text-text-tertiary">Card: </span>
                          <span class="font-medium capitalize text-text-primary">
                            {usage().paymentMethod!.brand} ••••{' '}
                            {usage().paymentMethod!.last4}
                          </span>
                          <span class="text-text-tertiary ml-1">
                            (exp{' '}
                            {String(usage().paymentMethod!.expMonth).padStart(
                              2,
                              '0'
                            )}
                            /{usage().paymentMethod!.expYear})
                          </span>
                        </div>
                      </Show>
                      <Show when={usage().nextInvoice}>
                        <div>
                          <span class="text-text-tertiary">Next invoice: </span>
                          <span class="font-medium text-text-primary">
                            {(
                              usage().nextInvoice!.amountDue / 100
                            ).toLocaleString('en-US', {
                              style: 'currency',
                              currency:
                                usage().nextInvoice!.currency.toUpperCase(),
                            })}
                          </span>
                        </div>
                      </Show>
                    </div>
                  </Show>

                  <div class="grid grid-cols-1 divide-y divide-border-default sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                    <For
                      each={Object.keys(DIMENSION_LABELS) as LimitDimension[]}
                    >
                      {(dim) => (
                        <div class="py-3 first:pt-0 last:pb-0 sm:px-4 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                          <UsageBar
                            label={DIMENSION_LABELS[dim]}
                            value={formatUsage(dim)}
                            percent={usagePercent(dim)}
                          />
                        </div>
                      )}
                    </For>
                  </div>

                  {/* Features */}
                  <div class="mt-6 border-t border-border-default pt-6">
                    <h3 class="mb-3 text-sm font-medium text-text-secondary">
                      Feature Access
                    </h3>
                    <div class="flex flex-wrap gap-3">
                      <For each={Object.keys(FEATURE_LABELS) as FeatureFlag[]}>
                        {(feat) => (
                          <span
                            class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                              usage().features[feat]
                                ? 'bg-status-success-bg text-status-success-text'
                                : 'bg-bg-muted text-text-tertiary'
                            }`}
                          >
                            {usage().features[feat] ? '✓' : '✗'}{' '}
                            {FEATURE_LABELS[feat]}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </Show>
      </Show>

      {/* Plan Comparison */}
      <Show when={!plansResource.loading && plansResource()}>
        <div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-semibold text-text-primary">
              Available Plans
            </h2>
            {/* Billing cycle toggle */}
            <div class="inline-flex rounded-lg border border-border-default p-0.5">
              <button
                class={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle() === 'monthly'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                class={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  billingCycle() === 'annual'
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setBillingCycle('annual')}
              >
                Annual
                <span class="ml-1.5 rounded-full bg-status-success-bg px-1.5 py-0.5 text-xs text-status-success-text">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <For each={plansResource()}>
              {(plan: PlanDefinition) => {
                const effectivePlan = () =>
                  optimisticPlan() ?? subscriptionStore.usage()?.plan ?? 'free';
                const currentCycle = () =>
                  subscriptionStore.usage()?.billingCycle ?? null;
                // For paid plans, isCurrent only if tier AND cycle match (or if no cycle info exists)
                const isCurrent = () => {
                  if (effectivePlan() !== plan.tier) return false;
                  if (plan.tier === 'free') return true;
                  // When a downgrade is pending, the Stripe subscription is unchanged
                  // (price change only happens at renewal via invoice.created webhook).
                  // So billing cycle and plan from Stripe are still the current plan's
                  // values — isCurrent() works naturally without any override.
                  // If no cycle info yet (e.g. webhook pending), still show as current
                  if (!currentCycle()) return true;
                  return currentCycle() === billingCycle();
                };
                return (
                  <PlanCard
                    plan={plan}
                    isCurrent={isCurrent()}
                    isChanging={changingTo() === plan.tier || isUpgrading()}
                    canChange={isAdmin()}
                    billingCycle={billingCycle()}
                    pendingDowngradeTarget={
                      subscriptionStore.pendingDowngrade()?.targetPlan ?? null
                    }
                    currentPlan={effectivePlan()}
                    currentBillingCycle={currentCycle()}
                    onSelect={() => handleChangePlan(plan.tier)}
                  />
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Stripe Billing Management — only for admins on paid plans */}
      <Show
        when={
          isAdmin() &&
          (subscriptionStore.usage()?.plan === 'pro' ||
            subscriptionStore.usage()?.plan === 'enterprise')
        }
      >
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-text-primary">
                  Billing Management
                </h2>
                <p class="text-sm text-text-secondary">
                  Manage payment methods, download invoices, or cancel your
                  subscription.
                </p>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleOpenPortal}
                  disabled={isOpeningPortal()}
                >
                  {isOpeningPortal() ? 'Opening…' : 'Manage Billing'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling()}
                  class="text-accent-danger hover:text-accent-danger"
                >
                  {isCancelling() ? 'Cancelling…' : 'Cancel Plan'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </Show>

      {/* Invoice History */}
      <Show
        when={
          isAdmin() &&
          !invoicesResource.loading &&
          invoicesResource() &&
          (invoicesResource()?.length ?? 0) > 0
        }
      >
        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-text-primary">
              Invoice History
            </h2>
          </CardHeader>
          <CardBody>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-text-tertiary border-b border-border-default text-left text-xs uppercase tracking-wide">
                    <th class="pb-3 pr-4">Date</th>
                    <th class="pb-3 pr-4">Amount</th>
                    <th class="pb-3 pr-4">Status</th>
                    <th class="pb-3">Invoice</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border-default">
                  <For each={invoicesResource()}>
                    {(inv: Invoice) => (
                      <tr>
                        <td class="py-3 pr-4 text-text-secondary">
                          {new Date(inv.created * 1000).toLocaleDateString()}
                        </td>
                        <td class="py-3 pr-4 font-medium text-text-primary">
                          {(inv.amountPaid / 100).toLocaleString('en-US', {
                            style: 'currency',
                            currency: inv.currency.toUpperCase(),
                          })}
                        </td>
                        <td class="py-3 pr-4">
                          <span
                            class={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              inv.status === 'paid'
                                ? 'bg-status-success-bg text-status-success-text'
                                : inv.status === 'open'
                                  ? 'bg-status-warning-bg text-status-warning-text'
                                  : 'bg-bg-muted text-text-tertiary'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td class="py-3">
                          <Show when={inv.hostedInvoiceUrl}>
                            <a
                              href={inv.hostedInvoiceUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-accent-primary hover:underline"
                            >
                              View
                            </a>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </Show>

      {/* Manage Locked Resources — only show for admins */}
      <Show when={isAdmin() && isDataLoaded()}>
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-text-primary">
                  Manage Locked Resources
                </h2>
                <p class="text-sm text-text-secondary">
                  Unlock resources after upgrading, or swap which are locked
                  without changing your plan.
                </p>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="primary"
                  onClick={() => setShowResolveModal(true)}
                >
                  Unlock Resources
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSwapModal(true)}
                >
                  Swap
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div class="space-y-1">
              <p class="text-text-tertiary text-xs">
                <span class="font-medium text-text-secondary">Unlock:</span>{' '}
                After upgrading your plan, unlock locked storehouses or
                reactivate deactivated users (within your new plan's limits).
              </p>
              <p class="text-text-tertiary text-xs">
                <span class="font-medium text-text-secondary">Swap:</span>{' '}
                Exchange which resources are locked — 1-for-1, net-zero. Limited
                to 2 swaps per day.
              </p>
            </div>
          </CardBody>
        </Card>
      </Show>

      {/* Payment Modal (Stripe) */}
      <PaymentModal
        isOpen={showPaymentModal()}
        plan={paymentPlan()}
        cycle={billingCycle()}
        onClose={() => {
          setShowPaymentModal(false);
          setUpgradeClientSecret(null);
        }}
        onSuccess={handlePaymentSuccess}
        initialClientSecret={upgradeClientSecret()}
      />

      {/* Downgrade Modal */}
      <DowngradeModal
        isOpen={showDowngradeModal()}
        targetPlan={downgradeTarget()}
        onClose={() => setShowDowngradeModal(false)}
        onConfirm={handleDowngradeConfirm}
        isSubmitting={isDowngrading()}
      />

      {/* Swap Modal */}
      <SwapModal
        isOpen={showSwapModal()}
        onClose={() => setShowSwapModal(false)}
        onConfirm={handleSwapConfirm}
        isSubmitting={isSwapping()}
      />

      {/* Resolve / Unlock Modal */}
      <ResolveModal
        isOpen={showResolveModal()}
        onClose={() => setShowResolveModal(false)}
        onConfirm={handleResolveConfirm}
        isSubmitting={isResolving()}
      />

      {/* Confirm: Paid → paid upgrade (e.g. pro → enterprise) */}
      <ConfirmDialog
        isOpen={showUpgradeConfirm()}
        title={`Upgrade to ${upgradeTarget().charAt(0).toUpperCase() + upgradeTarget().slice(1)}`}
        confirmLabel="Confirm Upgrade"
        onConfirm={executeUpgradeConfirm}
        onCancel={() => setShowUpgradeConfirm(false)}
        isSubmitting={isUpgrading()}
      >
        {(() => {
          const targetPlanDef = plansResource()?.find(
            (p: PlanDefinition) => p.tier === upgradeTarget()
          );
          const cycle = billingCycle();
          const price = targetPlanDef
            ? cycle === 'annual'
              ? `$${(targetPlanDef.priceAnnual / 100).toFixed(2)}/yr`
              : `$${(targetPlanDef.priceMonthly / 100).toFixed(0)}/mo`
            : null;
          return (
            <div class="space-y-3">
              <p>
                Your plan will be upgraded immediately to{' '}
                <span class="font-semibold capitalize">{upgradeTarget()}</span>
                {price && (
                  <span>
                    {' '}
                    at <span class="font-semibold">{price}</span>
                  </span>
                )}{' '}
                ({cycle}).
              </p>
              <p>
                Your payment method on file will be charged the prorated
                difference for the remainder of this billing period.
              </p>
              <p class="text-text-tertiary">
                Starting next billing cycle you'll be charged the full{' '}
                {upgradeTarget()} rate.
              </p>
            </div>
          );
        })()}
      </ConfirmDialog>

      {/* Confirm: Paid → paid downgrade */}
      <ConfirmDialog
        isOpen={showDowngradeConfirm()}
        title={`Switch to ${pendingDowngradeTier().charAt(0).toUpperCase() + pendingDowngradeTier().slice(1)}`}
        confirmLabel="Schedule Change"
        onConfirm={executeDowngradeConfirm}
        onCancel={() => setShowDowngradeConfirm(false)}
        isSubmitting={!!changingTo()}
      >
        <div class="space-y-3">
          <p>
            Your current plan will remain active until the end of your billing
            period. The plan change will take effect at the next renewal.
          </p>
          <p class="text-text-tertiary">
            No immediate charge — you'll continue to have full access to your
            current plan's features until then.
          </p>
        </div>
      </ConfirmDialog>

      {/* Confirm: Cancel pending downgrade */}
      <ConfirmDialog
        isOpen={showCancelDowngradeConfirm()}
        title="Cancel Scheduled Plan Change"
        confirmLabel="Keep Current Plan"
        onConfirm={executeCancelPendingDowngrade}
        onCancel={() => setShowCancelDowngradeConfirm(false)}
        isSubmitting={isCancellingDowngrade()}
      >
        <p>
          Cancel the scheduled plan change? Your current plan will continue at
          the next renewal and you'll be charged the current rate.
        </p>
      </ConfirmDialog>

      {/* Confirm: Cancel subscription */}
      <ConfirmDialog
        isOpen={showCancelSubConfirm()}
        title="Cancel Subscription"
        confirmLabel="Cancel Subscription"
        danger
        onConfirm={executeCancelSubscription}
        onCancel={() => setShowCancelSubConfirm(false)}
        isSubmitting={isCancelling()}
      >
        <div class="space-y-3">
          <p>Are you sure you want to cancel your subscription?</p>
          <p class="text-text-tertiary">
            Your plan will remain active until the end of the current billing
            period. After that, your account will be downgraded to the Free
            plan.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function UsageBar(props: { label: string; value: string; percent: number }) {
  const barColor = () => {
    if (props.percent >= 90) return 'bg-accent-danger';
    if (props.percent >= 70) return 'bg-status-warning-text';
    return 'bg-accent-primary';
  };

  return (
    <div>
      <div class="mb-1 flex items-center justify-between text-sm">
        <span class="text-text-secondary">{props.label}</span>
        <span class="font-medium text-text-primary">{props.value}</span>
      </div>
      <div class="bg-bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          class={`h-full rounded-full transition-all ${barColor()}`}
          style={{ width: `${props.percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard(props: {
  plan: PlanDefinition;
  isCurrent: boolean;
  isChanging: boolean;
  canChange: boolean;
  billingCycle: BillingCycle;
  pendingDowngradeTarget: PlanTier | null;
  currentPlan: PlanTier;
  currentBillingCycle: BillingCycle | null;
  onSelect: () => void;
}) {
  const formatLimit = (v: number) => (v === -1 ? 'Unlimited' : String(v));
  const isPendingTarget = () =>
    props.pendingDowngradeTarget === props.plan.tier;
  /** Annual → monthly is never allowed (regardless of tier direction) */
  const isAnnualDowngradeBlocked = () =>
    props.currentBillingCycle === 'annual' && props.billingCycle === 'monthly';

  const priceDisplay = () => {
    if (props.plan.tier === 'free') return 'Free';
    const cents =
      props.billingCycle === 'annual'
        ? props.plan.priceAnnual
        : props.plan.priceMonthly;
    const dollars = cents / 100;
    return props.billingCycle === 'annual'
      ? `$${dollars.toFixed(2)}/yr`
      : `$${dollars}/mo`;
  };

  return (
    <Card
      class={`flex flex-col border-2 ${
        props.isCurrent ? TIER_COLORS[props.plan.tier] : 'border-border-default'
      } ${props.plan.comingSoon ? 'opacity-75' : ''}`}
    >
      <CardHeader>
        <div class="text-center">
          <div class="flex items-center justify-center gap-2">
            <h3 class="text-lg font-bold text-text-primary">
              {props.plan.label}
            </h3>
            <Show when={props.plan.comingSoon}>
              <span class="bg-bg-muted rounded-full px-2 py-0.5 text-xs font-semibold text-text-secondary">
                Coming Soon
              </span>
            </Show>
          </div>
          <p class="mt-2 text-2xl font-semibold text-accent-primary">
            {priceDisplay()}
          </p>{' '}
          <p class="mt-1 text-sm text-text-secondary">
            {props.plan.description}
          </p>
        </div>
      </CardHeader>
      <CardBody class="flex flex-1 flex-col justify-between">
        <div class="space-y-4">
          {/* Limits */}
          <div>
            <h4 class="text-text-tertiary mb-2 text-xs font-semibold uppercase tracking-wide">
              Limits
            </h4>
            <ul class="space-y-1.5 text-sm">
              <For each={Object.keys(DIMENSION_LABELS) as LimitDimension[]}>
                {(dim) => (
                  <li class="flex justify-between">
                    <span class="text-text-secondary">
                      {DIMENSION_LABELS[dim]}
                    </span>
                    <span class="font-medium text-text-primary">
                      {formatLimit(props.plan.limits[dim])}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h4 class="text-text-tertiary mb-2 text-xs font-semibold uppercase tracking-wide">
              Features
            </h4>
            <ul class="space-y-1.5 text-sm">
              <For each={Object.keys(FEATURE_LABELS) as FeatureFlag[]}>
                {(feat) => (
                  <li class="flex items-center gap-2">
                    <span
                      class={
                        props.plan.features[feat]
                          ? 'text-status-success-text'
                          : 'text-text-tertiary'
                      }
                    >
                      {props.plan.features[feat] ? '✓' : '✗'}
                    </span>
                    <span
                      class={
                        props.plan.features[feat]
                          ? 'text-text-primary'
                          : 'text-text-tertiary line-through'
                      }
                    >
                      {FEATURE_LABELS[feat]}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </div>

        {/* Action */}
        <div class="mt-6">
          <Show
            when={!props.plan.comingSoon}
            fallback={
              <Button variant="outline" fullWidth disabled>
                Coming Soon
              </Button>
            }
          >
            <Show
              when={!props.isCurrent}
              fallback={
                <Button variant="outline" fullWidth disabled>
                  Current Plan
                </Button>
              }
            >
              {/* Free plan is not selectable when on a paid plan —
                users must use "Cancel Plan" to downgrade to free */}
              <Show
                when={
                  !(props.plan.tier === 'free' && props.currentPlan !== 'free')
                }
                fallback={
                  <p class="text-text-tertiary text-center text-xs">
                    Use "Cancel Plan" to downgrade
                  </p>
                }
              >
                <Show
                  when={!isAnnualDowngradeBlocked()}
                  fallback={
                    <p class="text-text-tertiary text-center text-xs">
                      Cannot switch from annual to monthly billing
                    </p>
                  }
                >
                  <Show
                    when={!isPendingTarget()}
                    fallback={
                      <Button variant="outline" fullWidth disabled>
                        Change Scheduled
                      </Button>
                    }
                  >
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={!props.canChange || props.isChanging}
                      onClick={props.onSelect}
                    >
                      {props.isChanging
                        ? 'Changing...'
                        : props.canChange
                          ? `Switch to ${props.plan.label}`
                          : 'Admin Required'}
                    </Button>
                  </Show>
                </Show>
              </Show>
            </Show>
          </Show>
        </div>
      </CardBody>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div class="space-y-6">
      <div class="animate-pulse rounded-lg border border-border-default bg-bg-surface p-6">
        <div class="bg-bg-muted mb-4 h-6 w-1/3 rounded" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <For each={[1, 2, 3, 4]}>
            {() => (
              <div>
                <div class="bg-bg-muted mb-2 h-4 w-2/3 rounded" />
                <div class="bg-bg-muted h-2 w-full rounded-full" />
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
