/**
 * Subscription / Billing Types
 *
 * Mirrors the backend plan definitions and subscription model.
 */

// ============================================
// Plan Types
// ============================================

export type PlanTier = 'free' | 'pro' | 'enterprise';

export type FeatureFlag = 'transfers' | 'customRoles' | 'advancedReports';

export type LimitDimension =
  | 'storehouses'
  | 'users'
  | 'items'
  | 'monthlyTransactions';

export interface PlanLimits {
  storehouses: number;
  users: number;
  items: number;
  monthlyTransactions: number;
  apiRequestsPerMinute: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  description: string;
  limits: PlanLimits;
  features: Record<FeatureFlag, boolean>;
  /** Price in USD cents (0 for free) */
  priceMonthly: number;
  priceAnnual: number;
  /** When true, the plan is not yet available */
  comingSoon?: boolean;
}

// ============================================
// Usage Summary (from GET /subscription)
// ============================================

export interface UsageEntry {
  current: number;
  limit: number; // -1 = unlimited
}

export interface UsageSummary {
  plan: PlanTier;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
  limits: {
    storehouses: UsageEntry;
    users: UsageEntry;
    items: UsageEntry;
    monthlyTransactions: UsageEntry;
  };
  features: Record<FeatureFlag, boolean>;
  apiRequestsPerMinute: number;
  /** ISO date string — when the current billing period starts (null for free / no Stripe) */
  currentPeriodStart: string | null;
  /** ISO date string — when the current billing period ends (null for free / no Stripe) */
  currentPeriodEnd: string | null;
  /** When the subscription was canceled (null if not canceled) */
  canceledAt: string | null;
  /** Current billing cycle (null for free / unknown) */
  billingCycle: BillingCycle | null;
  /** Pending downgrade info (if any) */
  pendingDowngrade: PendingDowngrade | null;
  /** Whether this subscription is backed by a Stripe subscription */
  hasStripeSubscription: boolean;
  /** Payment method on file (null if none) */
  paymentMethod: PaymentMethodInfo | null;
  /** Next upcoming invoice (null if none / free plan) */
  nextInvoice: NextInvoiceInfo | null;
  /** ISO date — when the trial ends (null if not trialing) */
  trialEndsAt: string | null;
  /** Whether this business has already used its one-time free trial */
  hasUsedTrial: boolean;

  /** Raw limit overrides currently set (for dev portal display) */
  limitOverrides?: Record<string, number>;
  /** Raw feature overrides currently set (for dev portal display) */
  featureOverrides?: Record<string, boolean>;
}

// ============================================
// Request Types
// ============================================

export interface ChangePlanRequest {
  plan: PlanTier;
  /** Billing cycle for paid→paid downgrades */
  cycle?: BillingCycle;
  /** Storehouses to lock when downgrading */
  lockedStorehouseIds?: string[];
  /** Users to deactivate when downgrading */
  deactivatedUserIds?: string[];
}

// ============================================
// Downgrade Types
// ============================================

export interface DowngradeStorehouse {
  id: string;
  name: string;
  createdAt: string;
}

export interface DowngradeUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface DowngradeRequirements {
  storehousesToLock: number;
  usersToDeactivate: number;
  currentStorehouses: DowngradeStorehouse[];
  currentActiveUsers: DowngradeUser[];
}

export interface PendingDowngrade {
  targetPlan: PlanTier;
  initiatedAt: string;
  gracePeriodEndsAt: string;
  executed: boolean;
}

// ============================================
// Payment & Invoice Info
// ============================================

export interface PaymentMethodInfo {
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
}

export interface NextInvoiceInfo {
  amountDue: number;
  currency: string;
  dueDate: string;
}

export interface ResolveDowngradeRequest {
  unlockStorehouseIds?: string[];
  reactivateUserIds?: string[];
}

export interface SwapResourcesRequest {
  /** Storehouses to lock (currently active) */
  lockStorehouseIds?: string[];
  /** Storehouses to unlock (currently locked) */
  unlockStorehouseIds?: string[];
  /** Users to deactivate (currently active) */
  deactivateUserIds?: string[];
  /** Users to reactivate (currently inactive) */
  reactivateUserIds?: string[];
}

export interface SwapCandidates {
  lockedStorehouses: DowngradeStorehouse[];
  activeStorehouses: DowngradeStorehouse[];
  inactiveUsers: DowngradeUser[];
  activeUsers: DowngradeUser[];
}

// ============================================
// Stripe Types
// ============================================

export type BillingCycle = 'monthly' | 'annual';

/** Trimmed invoice representation from GET /stripe/invoices */
export interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: number;
  periodStart: number;
  periodEnd: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface EnforceLimitsRequest {
  /** Storehouses to lock to comply with current plan limits */
  lockedStorehouseIds?: string[];
  /** Users to deactivate to comply with current plan limits */
  deactivatedUserIds?: string[];
}

/** Response from POST /stripe/subscribe */
export interface CreateSubscriptionResponse {
  clientSecret: string | null;
  subscriptionId: string;
  customerId: string;
  /** True when the sub was already active (no new payment needed) */
  alreadyActive?: boolean;
  /** True when running in mock Stripe mode */
  mock?: boolean;
}

/** Response from POST /stripe/portal */
export interface PortalSessionResponse {
  url: string;
}

/** Response from POST /stripe/cancel */
export interface CancelSubscriptionResponse {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: number;
}
