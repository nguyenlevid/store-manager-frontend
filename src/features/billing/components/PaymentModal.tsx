/**
 * PaymentModal
 *
 * Embeds a Stripe Payment Element inside a modal dialog.
 * Flow:
 *  1. On open → call POST /stripe/subscribe to get a clientSecret
 *  2. Mount Stripe Payment Element in the modal body
 *  3. On submit → stripe.confirmPayment(...) with redirect: 'if_required'
 *  4. On success → call onSuccess() so the parent can refetch subscription
 */

import { createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { loadStripe } from '@stripe/stripe-js';
import type {
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { Button, Alert } from '@/shared/ui';
import { createSubscription } from '../api/stripe.api';
import { getErrorMessage } from '@/shared/lib/error-messages';
import type { PlanTier, BillingCycle } from '../types/billing.types';

// ============================================
// Types
// ============================================

interface PaymentModalProps {
  isOpen: boolean;
  plan: Exclude<PlanTier, 'free'>;
  cycle: BillingCycle;
  onClose: () => void;
  /** Called after a successful payment / subscription confirmation */
  onSuccess: () => void;
  /**
   * If provided, skip calling POST /stripe/subscribe and use this
   * clientSecret directly.  Used when an upgrade auto-charge failed and
   * the caller already holds the PaymentIntent's clientSecret.
   */
  initialClientSecret?: string | null;
}

// ============================================
// Lazy Stripe loader (singleton promise)
// ============================================

let _stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise(): ReturnType<typeof loadStripe> {
  if (!_stripePromise) {
    const pk = import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY'] as string;
    _stripePromise = loadStripe(pk || '');
  }
  return _stripePromise;
}

// ============================================
// PaymentElementMount — inner component
// Mounts the Stripe Payment Element once the clientSecret is available.
// ============================================

function PaymentElementMount(props: {
  clientSecret: string;
  onReady: (stripe: Stripe, elements: StripeElements) => void;
  onError: (msg: string) => void;
}) {
  let containerRef!: HTMLDivElement;
  // We use a signal to trigger the mount only after the div has been inserted into the DOM
  const [mounted, setMounted] = createSignal(false);
  let destroyed = false;

  // This ref callback fires when the div appears in the DOM
  const refCallback = (el: HTMLDivElement) => {
    containerRef = el;
    setMounted(true);
  };

  createEffect(() => {
    if (!mounted()) return;

    let paymentElement: StripePaymentElement | null = null;
    destroyed = false;

    const setup = async () => {
      const stripe = await getStripePromise();
      if (!stripe || destroyed) {
        if (!stripe)
          props.onError(
            'Stripe failed to initialise. Check VITE_STRIPE_PUBLISHABLE_KEY.'
          );
        return;
      }
      const elements = stripe.elements({
        clientSecret: props.clientSecret,
        appearance: {
          theme: document.documentElement.classList.contains('dark')
            ? 'night'
            : 'stripe',
        },
      });
      paymentElement = elements.create('payment');

      // Listen for loading errors (e.g. invalid client secret)
      paymentElement.on('loaderror', (event: any) => {
        const msg =
          event?.error?.message ||
          'Payment form failed to load. Please try again.';
        props.onError(msg);
      });

      if (!destroyed) {
        paymentElement.mount(containerRef);
        props.onReady(stripe, elements);
      }
    };

    setup().catch((err) => props.onError(String(err)));

    onCleanup(() => {
      destroyed = true;
      try {
        paymentElement?.unmount();
      } catch {
        // Element may already be destroyed — safe to ignore
      }
    });
  });

  return (
    <div ref={refCallback} id="payment-element" class="mb-4 min-h-[150px]" />
  );
}

// ============================================
// PaymentModal
// ============================================

export function PaymentModal(props: PaymentModalProps) {
  const [clientSecret, setClientSecret] = createSignal<string | null>(null);
  const [loadError, setLoadError] = createSignal('');
  const [payError, setPayError] = createSignal('');
  const [isFetching, setIsFetching] = createSignal(false);
  const [isConfirming, setIsConfirming] = createSignal(false);

  let stripeRef: Stripe | null = null;
  let elementsRef: StripeElements | null = null;

  // Reset and fetch a new clientSecret whenever the modal opens
  createEffect(() => {
    if (!props.isOpen) {
      // Reset state on close so next open is clean
      setClientSecret(null);
      setLoadError('');
      setPayError('');
      stripeRef = null;
      elementsRef = null;
      return;
    }

    // If the caller already has a clientSecret (e.g. upgrade auto-charge
    // failed), use it directly instead of calling the subscribe endpoint again.
    if (props.initialClientSecret) {
      setClientSecret(props.initialClientSecret);
      return;
    }

    setIsFetching(true);
    setLoadError('');

    createSubscription(props.plan, props.cycle)
      .then((res: any) => {
        // Mock mode: backend returns mock=true and clientSecret='mock_secret_skip_payment'
        if (res.mock || res.clientSecret === 'mock_secret_skip_payment') {
          // In mock mode the backend already updated the plan, just show success
          props.onSuccess();
          props.onClose();
          return;
        }
        if (res.alreadyActive) {
          // Subscription is already active on Stripe but the webhook
          // hasn't fired yet.  Show a notice instead of re-charging.
          setLoadError(
            'Your payment was already processed! Your plan will activate automatically once the payment is confirmed. Please wait a moment and refresh the page.'
          );
          return;
        }
        if (res.clientSecret) {
          setClientSecret(res.clientSecret);
        } else {
          // clientSecret null means payment already succeeded (e.g., upgrade proration)
          props.onSuccess();
          props.onClose();
        }
      })
      .catch((err: unknown) => {
        setLoadError(getErrorMessage(err as any));
      })
      .finally(() => setIsFetching(false));
  });

  const handleReady = (stripe: Stripe, elements: StripeElements) => {
    stripeRef = stripe;
    elementsRef = elements;
  };

  const handleSubmit = async () => {
    if (!stripeRef || !elementsRef) {
      setPayError('Payment form is not ready yet. Please wait for it to load.');
      return;
    }
    setIsConfirming(true);
    setPayError('');

    try {
      const { error: stripeError, paymentIntent } =
        await stripeRef.confirmPayment({
          elements: elementsRef,
          confirmParams: {
            return_url: `${window.location.origin}/billing`,
          },
          redirect: 'if_required',
        });

      if (stripeError) {
        setPayError(stripeError.message ?? 'Payment failed. Please try again.');
        setIsConfirming(false);
        return;
      }

      // Payment succeeded without redirect (e.g., card didn't require 3DS)
      if (
        paymentIntent?.status === 'succeeded' ||
        paymentIntent?.status === 'requires_capture'
      ) {
        props.onSuccess();
        props.onClose();
      } else {
        // Redirect happened — browser navigated away; this branch rarely fires
        setIsConfirming(false);
      }
    } catch (err: any) {
      setPayError(
        err?.message ?? 'An unexpected error occurred. Please try again.'
      );
      setIsConfirming(false);
    }
  };

  const PLAN_PRICES: Record<string, Record<BillingCycle, string>> = {
    pro: { monthly: '$29/mo', annual: '$278.40/yr' },
    enterprise: { monthly: '$79/mo', annual: '$758.40/yr' },
  };
  const priceLabel = () => PLAN_PRICES[props.plan]?.[props.cycle] ?? '';

  return (
    <Show when={props.isOpen}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        {/* Panel */}
        <div class="mx-4 flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-bg-surface shadow-2xl">
          {/* Header */}
          <div class="flex items-start justify-between px-6 pb-4 pt-6">
            <div>
              <h2 class="text-xl font-semibold capitalize text-text-primary">
                Subscribe to {props.plan}
              </h2>
              <p class="mt-0.5 text-sm capitalize text-text-secondary">
                {props.cycle} billing &mdash; {priceLabel()}
              </p>
            </div>
            <button
              class="text-text-tertiary hover:bg-bg-muted ml-4 rounded-lg p-1 hover:text-text-primary"
              onClick={props.onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Scrollable body */}
          <div class="flex-1 overflow-y-auto px-6">
            {/* Error banners */}
            <Show when={loadError()}>
              <Alert variant="error" class="mb-4">
                {loadError()}
              </Alert>
            </Show>
            <Show when={payError()}>
              <Alert variant="error" class="mb-4">
                {payError()}
              </Alert>
            </Show>

            {/* Loading spinner while fetching clientSecret */}
            <Show when={isFetching()}>
              <div class="flex h-32 items-center justify-center">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
              </div>
            </Show>

            {/* Payment Element — only rendered after clientSecret is available */}
            <Show when={clientSecret() && !isFetching()}>
              <PaymentElementMount
                clientSecret={clientSecret()!}
                onReady={handleReady}
                onError={(msg) => setPayError(msg)}
              />
            </Show>
          </div>

          {/* Footer (fixed at bottom) */}
          <div class="px-6 pb-6 pt-2">
            <div class="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={props.onClose}
                disabled={isConfirming()}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={
                  !clientSecret() ||
                  isConfirming() ||
                  isFetching() ||
                  !!loadError()
                }
              >
                {isConfirming() ? 'Processing…' : `Pay ${priceLabel()}`}
              </Button>
            </div>

            <p class="text-text-tertiary mt-4 text-center text-xs">
              Payments are processed securely by{' '}
              <span class="font-medium">Stripe</span>. Your card details never
              touch our servers.
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
}
