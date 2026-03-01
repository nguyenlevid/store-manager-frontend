/**
 * Dev Portal Types
 *
 * Types used by the developer portal for business inspection and overrides.
 */

import type {
  UsageSummary,
  LimitDimension,
  FeatureFlag,
} from '@/features/billing/types/billing.types';

export interface BusinessSummary {
  id: string;
  name: string;
  email: string;
  address: string;
  phoneNumber: string;
  currency: string;
  timezone: string;
  createdAt: string;
}

export interface SetLimitOverrideRequest {
  dimension: LimitDimension;
  value: number;
  businessId: string;
}

export interface SetFeatureOverrideRequest {
  feature: FeatureFlag;
  enabled: boolean;
  businessId: string;
}

export interface ClearLimitOverrideRequest {
  dimension: LimitDimension;
  businessId: string;
}

export interface ClearFeatureOverrideRequest {
  feature: FeatureFlag;
  businessId: string;
}

export interface ClearAllOverridesRequest {
  businessId: string;
}

export type { UsageSummary, LimitDimension, FeatureFlag };
