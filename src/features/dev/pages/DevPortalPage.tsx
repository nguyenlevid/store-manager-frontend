/**
 * Dev Portal Page
 *
 * Developer-only operational dashboard with three tabs:
 *   1. Businesses   — Searchable list of all businesses
 *   2. Subscription — Full usage summary for selected business
 *   3. Overrides    — Set limit & feature overrides on selected business
 *
 * Protected by isDev() — non-dev users are redirected to /.
 */

import {
  createSignal,
  createResource,
  Show,
  For,
  onMount,
  type JSX,
} from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, CardBody, CardHeader, Button, Input } from '@/shared/ui';
import { isDev } from '@/features/auth/store/session.store';
import * as devApi from '../api/dev.api';
import type { BusinessSummary } from '../types/dev.types';
import type { BusinessActivity } from '../types/dev.types';
import type {
  UsageSummary,
  LimitDimension,
  FeatureFlag,
} from '@/features/billing/types/billing.types';
import { getErrorMessage } from '@/shared/lib/error-messages';
import { normalizeError } from '@/shared/lib/errors';

type Tab = 'businesses' | 'subscription' | 'overrides' | 'activity';

const DEV_CONTEXT_KEY = 'dev:selectedBusiness';

function saveDevContext(biz: BusinessSummary) {
  try {
    sessionStorage.setItem(
      DEV_CONTEXT_KEY,
      JSON.stringify({ id: biz.id, name: biz.name })
    );
  } catch {
    // storage full or unavailable — ignore
  }
}

function loadDevContext(): Pick<BusinessSummary, 'id' | 'name'> | null {
  try {
    const raw = sessionStorage.getItem(DEV_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.id && parsed?.name) return parsed;
  } catch {
    // corrupted — clean up
    sessionStorage.removeItem(DEV_CONTEXT_KEY);
  }
  return null;
}

export function clearDevContext() {
  sessionStorage.removeItem(DEV_CONTEXT_KEY);
}

const LIMIT_DIMENSIONS: LimitDimension[] = [
  'storehouses',
  'users',
  'items',
  'monthlyTransactions',
];

const FEATURE_FLAGS: FeatureFlag[] = [
  'transfers',
  'customRoles',
  'advancedReports',
];

export default function DevPortalPage() {
  const navigate = useNavigate();

  // Guard: redirect non-devs, then restore persisted context
  onMount(async () => {
    if (!isDev()) {
      navigate('/', { replace: true });
      return;
    }

    // Restore previously selected business from sessionStorage
    const saved = loadDevContext();
    if (saved) {
      try {
        // Fetch full business list and find the saved one
        const list = await devApi.getAllBusinesses();
        const match = list.find((b) => b.id === saved.id);
        if (match) {
          setSelectedBusiness(match);
          setActiveTab('subscription');
          await loadSubscription(match.id);
        } else {
          // Business no longer exists — clear stale context
          clearDevContext();
        }
      } catch {
        clearDevContext();
      }
    }
  });

  const [activeTab, setActiveTab] = createSignal<Tab>('businesses');
  const [selectedBusiness, setSelectedBusiness] =
    createSignal<BusinessSummary | null>(null);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [subscription, setSubscription] = createSignal<UsageSummary | null>(
    null
  );
  const [subLoading, setSubLoading] = createSignal(false);
  const [subError, setSubError] = createSignal<string | null>(null);

  // Fetch all businesses
  const [businesses] = createResource(
    () => searchQuery(),
    async (search) => {
      try {
        return await devApi.getAllBusinesses(search || undefined);
      } catch {
        return [];
      }
    }
  );

  // When a business is selected, persist & fetch its subscription
  async function selectBusiness(biz: BusinessSummary) {
    setSelectedBusiness(biz);
    saveDevContext(biz);
    setActiveTab('subscription');
    await loadSubscription(biz.id);
  }

  async function loadSubscription(businessId: string) {
    setSubLoading(true);
    setSubError(null);
    try {
      const usage = await devApi.inspectSubscription(businessId);
      setSubscription(usage);
    } catch (err) {
      setSubError(getErrorMessage(normalizeError(err)));
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  }

  return (
    <Show when={isDev()} fallback={null}>
      <div class="py-6">
        {/* Header */}
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-text-primary">Dev Portal</h1>
          <p class="mt-2 text-sm text-text-secondary">
            Operational dashboard for inspecting businesses, subscriptions, and
            overrides
          </p>
        </div>

        {/* Tab bar */}
        <div class="mb-6 flex gap-1 rounded-lg border border-border-default bg-bg-surface p-1">
          <TabButton
            active={activeTab() === 'businesses'}
            onClick={() => setActiveTab('businesses')}
            icon={
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            }
            label="Businesses"
          />
          <TabButton
            active={activeTab() === 'subscription'}
            onClick={() => setActiveTab('subscription')}
            disabled={!selectedBusiness()}
            icon={
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            }
            label="Subscription"
          />
          <TabButton
            active={activeTab() === 'overrides'}
            onClick={() => setActiveTab('overrides')}
            disabled={!selectedBusiness()}
            icon={
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            }
            label="Overrides"
          />
          <TabButton
            active={activeTab() === 'activity'}
            onClick={() => setActiveTab('activity')}
            icon={
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            }
            label="Activity"
          />
        </div>

        {/* Selected business context banner */}
        <Show when={selectedBusiness()}>
          {(biz) => (
            <div class="border-accent-primary/30 bg-accent-primary/5 mb-4 flex items-center gap-3 rounded-lg border px-4 py-2">
              <svg
                class="h-5 w-5 text-accent-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
                />
              </svg>
              <span class="text-sm font-medium text-text-primary">
                Context: <span class="text-accent-primary">{biz().name}</span>
              </span>
              <span class="text-text-tertiary text-xs">({biz().id})</span>
              <button
                class="text-text-tertiary ml-auto text-xs hover:text-text-primary"
                onClick={() => {
                  setSelectedBusiness(null);
                  setSubscription(null);
                  clearDevContext();
                  setActiveTab('businesses');
                }}
              >
                Clear
              </button>
            </div>
          )}
        </Show>

        {/* Tab content */}
        <Show when={activeTab() === 'businesses'}>
          <BusinessesPanel
            businesses={businesses() ?? []}
            loading={businesses.loading}
            searchQuery={searchQuery()}
            onSearch={setSearchQuery}
            onSelect={selectBusiness}
            selectedId={selectedBusiness()?.id}
          />
        </Show>

        <Show when={activeTab() === 'subscription'}>
          <SubscriptionPanel
            business={selectedBusiness()}
            subscription={subscription()}
            loading={subLoading()}
            error={subError()}
            onRefresh={() =>
              selectedBusiness() && loadSubscription(selectedBusiness()!.id)
            }
          />
        </Show>

        <Show when={activeTab() === 'overrides'}>
          <OverridesPanel
            business={selectedBusiness()}
            subscription={subscription()}
            onOverrideApplied={(usage) => setSubscription(usage)}
          />
        </Show>

        <Show when={activeTab() === 'activity'}>
          <ActivityPanel />
        </Show>
      </div>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Tab Button
// ─────────────────────────────────────────────────────────────

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  icon: JSX.Element;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      classList={{
        'bg-accent-primary text-text-inverse': props.active && !props.disabled,
        'text-text-secondary hover:bg-bg-hover':
          !props.active && !props.disabled,
        'cursor-not-allowed text-text-tertiary opacity-50': props.disabled,
      }}
      onClick={() => !props.disabled && props.onClick()}
      disabled={props.disabled}
    >
      <div class="flex items-center justify-center gap-2">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {props.icon}
        </svg>
        {props.label}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab 1: Businesses
// ─────────────────────────────────────────────────────────────

function BusinessesPanel(props: {
  businesses: BusinessSummary[];
  loading: boolean;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSelect: (biz: BusinessSummary) => void;
  selectedId?: string;
}) {
  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleSearch(value: string) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => props.onSearch(value), 300);
  }

  return (
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-text-primary">
            All Businesses
          </h2>
          <div class="w-72">
            <Input
              type="text"
              placeholder="Search businesses..."
              value={props.searchQuery}
              onInput={(e) => handleSearch(e.currentTarget.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <Show
          when={!props.loading}
          fallback={
            <div class="py-8 text-center text-text-secondary">
              Loading businesses...
            </div>
          }
        >
          <Show
            when={props.businesses.length > 0}
            fallback={
              <div class="py-8 text-center text-text-secondary">
                No businesses found
              </div>
            }
          >
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-border-subtle">
                    <th class="pb-3 pr-4 font-medium text-text-secondary">
                      Name
                    </th>
                    <th class="pb-3 pr-4 font-medium text-text-secondary">
                      Email
                    </th>
                    <th class="pb-3 pr-4 font-medium text-text-secondary">
                      Currency
                    </th>
                    <th class="pb-3 pr-4 font-medium text-text-secondary">
                      Created
                    </th>
                    <th class="pb-3 font-medium text-text-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.businesses}>
                    {(biz) => (
                      <tr
                        class="border-b border-border-subtle transition-colors hover:bg-bg-hover"
                        classList={{
                          'bg-accent-primary/5': biz.id === props.selectedId,
                        }}
                      >
                        <td class="py-3 pr-4 font-medium text-text-primary">
                          {biz.name}
                        </td>
                        <td class="py-3 pr-4 text-text-secondary">
                          {biz.email || '—'}
                        </td>
                        <td class="py-3 pr-4 text-text-secondary">
                          {biz.currency}
                        </td>
                        <td class="py-3 pr-4 text-text-secondary">
                          {biz.createdAt
                            ? new Date(biz.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                        <td class="py-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => props.onSelect(biz)}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab 2: Subscription
// ─────────────────────────────────────────────────────────────

function SubscriptionPanel(props: {
  business: BusinessSummary | null;
  subscription: UsageSummary | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const formatLimit = (v: number) => (v === -1 ? 'Unlimited' : String(v));

  return (
    <Show
      when={props.business}
      fallback={
        <Card>
          <CardBody>
            <div class="py-8 text-center text-text-secondary">
              Select a business from the Businesses tab first
            </div>
          </CardBody>
        </Card>
      }
    >
      <div class="space-y-6">
        {/* Subscription header */}
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-text-primary">
                Subscription Details
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={props.onRefresh}
                disabled={props.loading}
              >
                {props.loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <Show when={props.error}>
              <div class="border-accent-danger/30 bg-accent-danger/10 rounded-md border px-4 py-3 text-sm text-accent-danger">
                {props.error}
              </div>
            </Show>

            <Show
              when={props.subscription}
              fallback={
                <Show when={!props.error}>
                  <div class="py-4 text-center text-text-secondary">
                    {props.loading
                      ? 'Loading subscription...'
                      : 'No subscription data'}
                  </div>
                </Show>
              }
            >
              {(sub) => (
                <div class="space-y-6">
                  {/* Plan & Status row */}
                  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoItem
                      label="Plan"
                      value={
                        sub().plan.charAt(0).toUpperCase() + sub().plan.slice(1)
                      }
                    />
                    <InfoItem label="Status">
                      <StatusBadge status={sub().status} />
                    </InfoItem>
                    <InfoItem
                      label="Billing Cycle"
                      value={sub().billingCycle ?? 'N/A'}
                    />
                    <InfoItem
                      label="Has Stripe Sub"
                      value={sub().hasStripeSubscription ? 'Yes' : 'No'}
                    />
                  </div>

                  {/* Dates row */}
                  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <InfoItem
                      label="Period Start"
                      value={
                        sub().currentPeriodStart
                          ? new Date(
                              sub().currentPeriodStart!
                            ).toLocaleDateString()
                          : 'N/A'
                      }
                    />
                    <InfoItem
                      label="Period End"
                      value={
                        sub().currentPeriodEnd
                          ? new Date(
                              sub().currentPeriodEnd!
                            ).toLocaleDateString()
                          : 'N/A'
                      }
                    />
                    <InfoItem
                      label="Trial Ends"
                      value={
                        sub().trialEndsAt
                          ? new Date(sub().trialEndsAt!).toLocaleDateString()
                          : 'N/A'
                      }
                    />
                    <InfoItem
                      label="Canceled At"
                      value={
                        sub().canceledAt
                          ? new Date(sub().canceledAt!).toLocaleDateString()
                          : 'N/A'
                      }
                    />
                  </div>

                  {/* Payment method */}
                  <Show when={sub().paymentMethod}>
                    {(pm) => (
                      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <InfoItem
                          label="Payment"
                          value={`${pm().brand.toUpperCase()} •••• ${pm().last4}`}
                        />
                        <InfoItem
                          label="Expires"
                          value={`${pm().expMonth}/${pm().expYear}`}
                        />
                      </div>
                    )}
                  </Show>

                  {/* Pending downgrade */}
                  <Show when={sub().pendingDowngrade}>
                    {(pd) => (
                      <div class="border-status-warning-text/30 bg-status-warning-text/10 rounded-md border px-4 py-3">
                        <p class="text-sm font-medium text-status-warning-text">
                          Pending downgrade to{' '}
                          {pd().targetPlan.charAt(0).toUpperCase() +
                            pd().targetPlan.slice(1)}
                        </p>
                        <p class="mt-1 text-xs text-text-secondary">
                          Initiated:{' '}
                          {new Date(pd().initiatedAt).toLocaleDateString()} |
                          Grace period ends:{' '}
                          {new Date(
                            pd().gracePeriodEndsAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </Show>
                </div>
              )}
            </Show>
          </CardBody>
        </Card>

        {/* Usage limits */}
        <Show when={props.subscription}>
          {(sub) => (
            <Card>
              <CardHeader>
                <h2 class="text-lg font-semibold text-text-primary">
                  Usage Limits
                </h2>
              </CardHeader>
              <CardBody>
                <div class="space-y-4">
                  <For
                    each={
                      Object.entries(sub().limits) as [
                        string,
                        { current: number; limit: number },
                      ][]
                    }
                  >
                    {([dimension, entry]) => {
                      const percent = () =>
                        entry.limit === -1
                          ? 0
                          : Math.min(
                              100,
                              Math.round((entry.current / entry.limit) * 100)
                            );
                      const label = () =>
                        dimension
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (s) => s.toUpperCase());
                      const value = () =>
                        `${entry.current} / ${formatLimit(entry.limit)}`;

                      return (
                        <UsageBar
                          label={label()}
                          value={value()}
                          percent={percent()}
                        />
                      );
                    }}
                  </For>
                </div>
              </CardBody>
            </Card>
          )}
        </Show>

        {/* Features */}
        <Show when={props.subscription}>
          {(sub) => (
            <Card>
              <CardHeader>
                <h2 class="text-lg font-semibold text-text-primary">
                  Features
                </h2>
              </CardHeader>
              <CardBody>
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <For
                    each={Object.entries(sub().features) as [string, boolean][]}
                  >
                    {([feature, enabled]) => (
                      <div class="flex items-center gap-2 rounded-md border border-border-subtle px-3 py-2">
                        <div
                          class="h-2.5 w-2.5 rounded-full"
                          classList={{
                            'bg-accent-success': enabled,
                            'bg-text-tertiary': !enabled,
                          }}
                        />
                        <span class="text-sm text-text-primary">
                          {feature
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (s) => s.toUpperCase())}
                        </span>
                        <span class="text-text-tertiary ml-auto text-xs">
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )}
                  </For>
                </div>
              </CardBody>
            </Card>
          )}
        </Show>
      </div>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab 3: Overrides
// ─────────────────────────────────────────────────────────────

function OverridesPanel(props: {
  business: BusinessSummary | null;
  subscription: UsageSummary | null;
  onOverrideApplied: (usage: UsageSummary) => void;
}) {
  const [limitDimension, setLimitDimension] =
    createSignal<LimitDimension>('storehouses');
  const [limitValue, setLimitValue] = createSignal(0);
  const [featureFlag, setFeatureFlag] = createSignal<FeatureFlag>('transfers');
  const [featureEnabled, setFeatureEnabled] = createSignal(true);
  const [applying, setApplying] = createSignal(false);
  const [message, setMessage] = createSignal<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  async function applyLimitOverride() {
    if (!props.business) return;
    setApplying(true);
    setMessage(null);
    try {
      const usage = await devApi.setLimitOverride({
        businessId: props.business.id,
        dimension: limitDimension(),
        value: limitValue(),
      });
      props.onOverrideApplied(usage);
      setMessage({
        type: 'success',
        text: `Limit override applied: ${limitDimension()} = ${limitValue() === -1 ? 'unlimited' : limitValue()}`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(normalizeError(err)),
      });
    } finally {
      setApplying(false);
    }
  }

  async function applyFeatureOverride() {
    if (!props.business) return;
    setApplying(true);
    setMessage(null);
    try {
      const usage = await devApi.setFeatureOverride({
        businessId: props.business.id,
        feature: featureFlag(),
        enabled: featureEnabled(),
      });
      props.onOverrideApplied(usage);
      setMessage({
        type: 'success',
        text: `Feature override applied: ${featureFlag()} = ${featureEnabled() ? 'enabled' : 'disabled'}`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(normalizeError(err)),
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <Show
      when={props.business}
      fallback={
        <Card>
          <CardBody>
            <div class="py-8 text-center text-text-secondary">
              Select a business from the Businesses tab first
            </div>
          </CardBody>
        </Card>
      }
    >
      <div class="space-y-6">
        {/* Status message */}
        <Show when={message()}>
          {(msg) => (
            <div
              class="rounded-md border px-4 py-3 text-sm"
              classList={{
                'border-accent-success/30 bg-accent-success/10 text-accent-success':
                  msg().type === 'success',
                'border-accent-danger/30 bg-accent-danger/10 text-accent-danger':
                  msg().type === 'error',
              }}
            >
              {msg().text}
            </div>
          )}
        </Show>

        {/* Current overrides display */}
        <Show when={props.subscription}>
          {(sub) => {
            const limitOverrides = () => sub().limitOverrides ?? {};
            const featureOverrides = () => sub().featureOverrides ?? {};
            const hasAnyOverride = () =>
              Object.keys(limitOverrides()).length > 0 ||
              Object.keys(featureOverrides()).length > 0;

            return (
              <>
                {/* Effective values */}
                <Card>
                  <CardHeader>
                    <div class="flex items-center justify-between">
                      <h2 class="text-lg font-semibold text-text-primary">
                        Current Effective Values
                      </h2>
                      <Show when={hasAnyOverride()}>
                        <button
                          class="border-accent-danger/30 hover:bg-accent-danger/10 rounded-md border px-3 py-1 text-xs font-medium text-accent-danger transition-colors"
                          onClick={async () => {
                            if (!props.business) return;
                            setApplying(true);
                            setMessage(null);
                            try {
                              const usage = await devApi.clearAllOverrides({
                                businessId: props.business.id,
                              });
                              props.onOverrideApplied(usage);
                              setMessage({
                                type: 'success',
                                text: 'All overrides cleared — plan defaults restored',
                              });
                            } catch (err) {
                              setMessage({
                                type: 'error',
                                text: getErrorMessage(normalizeError(err)),
                              });
                            } finally {
                              setApplying(false);
                            }
                          }}
                          disabled={applying()}
                        >
                          {applying() ? 'Clearing...' : 'Clear All Overrides'}
                        </button>
                      </Show>
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <For
                        each={
                          Object.entries(sub().limits) as [
                            string,
                            { current: number; limit: number },
                          ][]
                        }
                      >
                        {([dim, entry]) => {
                          const isOverridden = () => dim in limitOverrides();
                          return (
                            <div
                              class="rounded-md border p-3"
                              classList={{
                                'border-accent-warning/40 bg-accent-warning/5':
                                  isOverridden(),
                                'border-border-subtle': !isOverridden(),
                              }}
                            >
                              <div class="flex items-center gap-1">
                                <p class="text-text-tertiary text-xs">
                                  {dim
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, (s) => s.toUpperCase())}
                                </p>
                                <Show when={isOverridden()}>
                                  <span class="bg-accent-warning/20 rounded px-1 py-0.5 text-[10px] font-medium text-accent-warning">
                                    OVR
                                  </span>
                                </Show>
                              </div>
                              <p class="mt-1 text-lg font-semibold text-text-primary">
                                {entry.limit === -1 ? '∞' : entry.limit}
                              </p>
                              <p class="text-xs text-text-secondary">
                                Using: {entry.current}
                              </p>
                              <Show when={isOverridden()}>
                                <button
                                  class="mt-1 text-[11px] text-accent-danger hover:underline"
                                  onClick={async () => {
                                    if (!props.business) return;
                                    setApplying(true);
                                    setMessage(null);
                                    try {
                                      const usage =
                                        await devApi.clearLimitOverride({
                                          businessId: props.business.id,
                                          dimension: dim as LimitDimension,
                                        });
                                      props.onOverrideApplied(usage);
                                      setMessage({
                                        type: 'success',
                                        text: `Cleared ${dim} override`,
                                      });
                                    } catch (err) {
                                      setMessage({
                                        type: 'error',
                                        text: getErrorMessage(
                                          normalizeError(err)
                                        ),
                                      });
                                    } finally {
                                      setApplying(false);
                                    }
                                  }}
                                  disabled={applying()}
                                >
                                  Clear
                                </button>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </div>

                    {/* Feature overrides */}
                    <Show when={Object.keys(featureOverrides()).length > 0}>
                      <div class="mt-4 border-t border-border-subtle pt-3">
                        <p class="text-text-tertiary mb-2 text-xs font-medium">
                          Feature Overrides
                        </p>
                        <div class="flex flex-wrap gap-2">
                          <For each={Object.entries(featureOverrides())}>
                            {([feature, enabled]) => (
                              <span class="border-accent-warning/30 bg-accent-warning/5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
                                <span class="text-text-primary">
                                  {feature
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/^./, (s) => s.toUpperCase())}
                                  : {(enabled as boolean) ? 'on' : 'off'}
                                </span>
                                <button
                                  class="ml-0.5 text-accent-danger hover:underline"
                                  onClick={async () => {
                                    if (!props.business) return;
                                    setApplying(true);
                                    setMessage(null);
                                    try {
                                      const usage =
                                        await devApi.clearFeatureOverride({
                                          businessId: props.business.id,
                                          feature: feature as FeatureFlag,
                                        });
                                      props.onOverrideApplied(usage);
                                      setMessage({
                                        type: 'success',
                                        text: `Cleared ${feature} override`,
                                      });
                                    } catch (err) {
                                      setMessage({
                                        type: 'error',
                                        text: getErrorMessage(
                                          normalizeError(err)
                                        ),
                                      });
                                    } finally {
                                      setApplying(false);
                                    }
                                  }}
                                  disabled={applying()}
                                >
                                  ×
                                </button>
                              </span>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>
                  </CardBody>
                </Card>
              </>
            );
          }}
        </Show>

        {/* Limit override form */}
        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-text-primary">
              Set Limit Override
            </h2>
          </CardHeader>
          <CardBody>
            <div class="flex flex-wrap items-end gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Dimension
                </label>
                <select
                  class="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
                  value={limitDimension()}
                  onChange={(e) =>
                    setLimitDimension(e.currentTarget.value as LimitDimension)
                  }
                >
                  <For each={LIMIT_DIMENSIONS}>
                    {(dim) => (
                      <option value={dim}>
                        {dim
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (s) => s.toUpperCase())}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Value
                  <span class="text-text-tertiary ml-1 text-xs">
                    (-1 = unlimited)
                  </span>
                </label>
                <input
                  type="number"
                  min="-1"
                  class="w-28 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
                  value={limitValue()}
                  onInput={(e) =>
                    setLimitValue(parseInt(e.currentTarget.value) || 0)
                  }
                />
              </div>
              <Button
                onClick={applyLimitOverride}
                disabled={applying()}
                size="sm"
              >
                {applying() ? 'Applying...' : 'Apply Limit Override'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Feature override form */}
        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-text-primary">
              Set Feature Override
            </h2>
          </CardHeader>
          <CardBody>
            <div class="flex flex-wrap items-end gap-4">
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Feature
                </label>
                <select
                  class="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
                  value={featureFlag()}
                  onChange={(e) =>
                    setFeatureFlag(e.currentTarget.value as FeatureFlag)
                  }
                >
                  <For each={FEATURE_FLAGS}>
                    {(f) => (
                      <option value={f}>
                        {f
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, (s) => s.toUpperCase())}
                      </option>
                    )}
                  </For>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-text-secondary">
                  Enabled
                </label>
                <label class="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-border-default text-accent-primary focus:ring-border-focus"
                    checked={featureEnabled()}
                    onChange={(e) => setFeatureEnabled(e.currentTarget.checked)}
                  />
                  <span class="text-sm text-text-primary">
                    {featureEnabled() ? 'On' : 'Off'}
                  </span>
                </label>
              </div>
              <Button
                onClick={applyFeatureOverride}
                disabled={applying()}
                size="sm"
              >
                {applying() ? 'Applying...' : 'Apply Feature Override'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </Show>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Info Item
// ─────────────────────────────────────────────────────────────

function InfoItem(props: {
  label: string;
  value?: string;
  children?: JSX.Element;
}) {
  return (
    <div>
      <p class="text-text-tertiary text-xs">{props.label}</p>
      <Show
        when={props.children}
        fallback={
          <p class="mt-0.5 text-sm font-medium text-text-primary">
            {props.value ?? '—'}
          </p>
        }
      >
        {props.children}
      </Show>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Status Badge
// ─────────────────────────────────────────────────────────────

function StatusBadge(props: { status: string }) {
  const colorClass = () => {
    switch (props.status) {
      case 'active':
        return 'bg-accent-success/10 text-accent-success border-accent-success/30';
      case 'trialing':
        return 'bg-accent-primary/10 text-accent-primary border-accent-primary/30';
      case 'past_due':
        return 'bg-status-warning-text/10 text-status-warning-text border-status-warning-text/30';
      case 'canceled':
      case 'expired':
        return 'bg-accent-danger/10 text-accent-danger border-accent-danger/30';
      default:
        return 'bg-bg-muted text-text-secondary border-border-subtle';
    }
  };

  return (
    <span
      class={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass()}`}
    >
      {props.status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Usage Bar (same pattern as BillingPage)
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// Tab 4: Activity
// ─────────────────────────────────────────────────────────────

function ActivityPanel() {
  const [activities, setActivities] = createSignal<BusinessActivity[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [sending, setSending] = createSignal<string | null>(null); // businessId being sent
  const [message, setMessage] = createSignal<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Load activity data on mount
  onMount(async () => {
    await fetchActivity();
  });

  async function fetchActivity() {
    setLoading(true);
    setError(null);
    try {
      const data = await devApi.getBusinessActivity();
      setActivities(data);
    } catch (err) {
      setError(getErrorMessage(normalizeError(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReminder(businessId: string, businessName: string) {
    if (!confirm(`Send a reminder email to the owner of "${businessName}"?`))
      return;

    setSending(businessId);
    setMessage(null);
    try {
      const result = await devApi.sendReminderEmail(businessId);
      setMessage({
        type: 'success',
        text: `Reminder sent to ${result.to} (${businessName})`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: getErrorMessage(normalizeError(err)),
      });
    } finally {
      setSending(null);
    }
  }

  function activityColor(days: number): string {
    if (days === -1) return 'bg-bg-muted'; // never active — grey
    if (days >= 90) return 'bg-accent-danger/15';
    if (days >= 60) return 'bg-accent-danger/8';
    if (days >= 30) return 'bg-status-warning-text/10';
    return ''; // recent — no highlight
  }

  function activityBadge(days: number): { label: string; class: string } {
    if (days === -1)
      return {
        label: 'Never',
        class: 'bg-bg-muted text-text-tertiary',
      };
    if (days >= 90)
      return {
        label: `${days}d`,
        class: 'bg-accent-danger/15 text-accent-danger',
      };
    if (days >= 60)
      return {
        label: `${days}d`,
        class: 'bg-accent-danger/10 text-accent-danger',
      };
    if (days >= 30)
      return {
        label: `${days}d`,
        class: 'bg-status-warning-text/15 text-status-warning-text',
      };
    return {
      label: `${days}d`,
      class: 'bg-accent-success/15 text-accent-success',
    };
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div class="space-y-4">
      {/* Status message */}
      <Show when={message()}>
        {(msg) => (
          <div
            class="rounded-md border px-4 py-3 text-sm"
            classList={{
              'border-accent-success/30 bg-accent-success/10 text-accent-success':
                msg().type === 'success',
              'border-accent-danger/30 bg-accent-danger/10 text-accent-danger':
                msg().type === 'error',
            }}
          >
            {msg().text}
          </div>
        )}
      </Show>

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">
                Business Activity
              </h2>
              <p class="mt-1 text-xs text-text-secondary">
                Sorted by least active. Tracks last transaction, import, and
                login.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchActivity}
              disabled={loading()}
            >
              {loading() ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Show when={error()}>
            <div class="border-accent-danger/30 bg-accent-danger/10 mb-4 rounded-md border px-4 py-3 text-sm text-accent-danger">
              {error()}
            </div>
          </Show>

          <Show
            when={!loading()}
            fallback={
              <div class="py-8 text-center text-text-secondary">
                Loading activity data...
              </div>
            }
          >
            <Show
              when={activities().length > 0}
              fallback={
                <div class="py-8 text-center text-text-secondary">
                  No businesses found
                </div>
              }
            >
              {/* Summary stats */}
              <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div class="rounded-md border border-border-subtle p-3">
                  <p class="text-text-tertiary text-xs">Total</p>
                  <p class="text-xl font-semibold text-text-primary">
                    {activities().length}
                  </p>
                </div>
                <div class="border-accent-success/30 rounded-md border p-3">
                  <p class="text-xs text-accent-success">Active (&lt;30d)</p>
                  <p class="text-xl font-semibold text-accent-success">
                    {
                      activities().filter(
                        (a) =>
                          a.daysSinceLastActivity >= 0 &&
                          a.daysSinceLastActivity < 30
                      ).length
                    }
                  </p>
                </div>
                <div class="border-status-warning-text/30 rounded-md border p-3">
                  <p class="text-xs text-status-warning-text">
                    Inactive (30-89d)
                  </p>
                  <p class="text-xl font-semibold text-status-warning-text">
                    {
                      activities().filter(
                        (a) =>
                          a.daysSinceLastActivity >= 30 &&
                          a.daysSinceLastActivity < 90
                      ).length
                    }
                  </p>
                </div>
                <div class="border-accent-danger/30 rounded-md border p-3">
                  <p class="text-xs text-accent-danger">
                    Dormant (90d+ / Never)
                  </p>
                  <p class="text-xl font-semibold text-accent-danger">
                    {
                      activities().filter(
                        (a) =>
                          a.daysSinceLastActivity === -1 ||
                          a.daysSinceLastActivity >= 90
                      ).length
                    }
                  </p>
                </div>
              </div>

              {/* Activity table */}
              <div class="overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead>
                    <tr class="border-b border-border-subtle">
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Business
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Plan
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Inactive
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Last Login
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Last Tx
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        Last Import
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        30d Txns
                      </th>
                      <th class="pb-3 pr-3 font-medium text-text-secondary">
                        30d Imports
                      </th>
                      <th class="pb-3 font-medium text-text-secondary">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={activities()}>
                      {(act) => {
                        const badge = activityBadge(act.daysSinceLastActivity);
                        return (
                          <tr
                            class={`border-b border-border-subtle transition-colors hover:bg-bg-hover ${activityColor(act.daysSinceLastActivity)}`}
                          >
                            <td class="py-3 pr-3">
                              <div class="font-medium text-text-primary">
                                {act.businessName}
                              </div>
                              <div class="text-text-tertiary text-xs">
                                {act.ownerEmail}
                              </div>
                            </td>
                            <td class="py-3 pr-3">
                              <span class="rounded-full border border-border-subtle px-2 py-0.5 text-xs text-text-secondary">
                                {act.plan}
                              </span>
                            </td>
                            <td class="py-3 pr-3">
                              <span
                                class={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge.class}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                            <td class="py-3 pr-3 text-text-secondary">
                              {formatDate(act.lastLoginAt)}
                            </td>
                            <td class="py-3 pr-3 text-text-secondary">
                              {formatDate(act.lastTransactionAt)}
                            </td>
                            <td class="py-3 pr-3 text-text-secondary">
                              {formatDate(act.lastImportAt)}
                            </td>
                            <td class="py-3 pr-3 text-center text-text-secondary">
                              {act.transactionCount30d}
                            </td>
                            <td class="py-3 pr-3 text-center text-text-secondary">
                              {act.importCount30d}
                            </td>
                            <td class="py-3">
                              <button
                                class="border-accent-primary/30 hover:bg-accent-primary/10 rounded-md border px-3 py-1 text-xs font-medium text-accent-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() =>
                                  handleSendReminder(
                                    act.businessId,
                                    act.businessName
                                  )
                                }
                                disabled={sending() === act.businessId}
                              >
                                {sending() === act.businessId
                                  ? 'Sending...'
                                  : 'Remind'}
                              </button>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </Show>
        </CardBody>
      </Card>
    </div>
  );
}
