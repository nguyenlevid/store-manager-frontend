/**
 * Stripe API
 *
 * Frontend API functions for the Stripe billing endpoints.
 */

import { apiClient } from '@/shared/lib/api-client';
import type {
  BillingCycle,
  PlanTier,
  CreateSubscriptionResponse,
  PortalSessionResponse,
  CancelSubscriptionResponse,
  Invoice,
} from '../types/billing.types';

const BASE = '/stripe';

/** Create or update the Stripe subscription; returns clientSecret for Payment Element */
export function createSubscription(
  plan: Exclude<PlanTier, 'free'>,
  cycle: BillingCycle
): Promise<CreateSubscriptionResponse> {
  return apiClient.post<CreateSubscriptionResponse>(`${BASE}/subscribe`, {
    plan,
    cycle,
  });
}

/** Create a Stripe Billing Portal session; returns redirect URL */
export function createPortalSession(
  returnUrl?: string
): Promise<PortalSessionResponse> {
  return apiClient.post<PortalSessionResponse>(`${BASE}/portal`, {
    returnUrl: returnUrl ?? window.location.href,
  });
}

/** List recent Stripe invoices for the business */
export function getInvoices(limit = 10): Promise<Invoice[]> {
  return apiClient.get<Invoice[]>(`${BASE}/invoices?limit=${limit}`);
}

/** Cancel Stripe subscription at end of billing period */
export function cancelSubscription(): Promise<CancelSubscriptionResponse> {
  return apiClient.post<CancelSubscriptionResponse>(`${BASE}/cancel`, {});
}

/** Reactivate a subscription that was scheduled for cancellation */
export function reactivateSubscription(): Promise<
  import('../types/billing.types').UsageSummary
> {
  return apiClient.post<import('../types/billing.types').UsageSummary>(
    `${BASE}/reactivate`,
    {}
  );
}

/** Cancel a pending paid→paid downgrade (revert to current plan on Stripe) */
export function cancelPendingDowngrade(): Promise<void> {
  return apiClient.post<void>(`${BASE}/cancel-pending-downgrade`, {});
}

/** Retry failed payment — redirects to Stripe Billing Portal for card update */
export function retryPayment(
  returnUrl?: string
): Promise<PortalSessionResponse> {
  return apiClient.post<PortalSessionResponse>(`${BASE}/retry-payment`, {
    returnUrl: returnUrl ?? window.location.href,
  });
}
