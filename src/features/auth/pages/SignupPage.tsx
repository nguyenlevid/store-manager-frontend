import { createSignal, createEffect, Show, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import {
  signupUser,
  user,
  status,
  isInitialized,
} from '../store/session.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';

export default function SignupPage() {
  const navigate = useNavigate();

  // Redirect if already authenticated (only after session is initialized)
  createEffect(() => {
    if (isInitialized() && status() === 'authenticated' && user()) {
      navigate('/', { replace: true });
    }
  });

  const [email, setEmail] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [emailSent, setEmailSent] = createSignal(false);
  const [resendCooldown, setResendCooldown] = createSignal(0);

  // Cooldown timer for resend button
  let cooldownTimer: ReturnType<typeof setInterval> | undefined;

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownTimer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownTimer);
          cooldownTimer = undefined;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  onCleanup(() => {
    if (cooldownTimer) clearInterval(cooldownTimer);
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!email().trim()) {
        notificationStore.warning('Please enter your email address', {
          title: 'Validation Error',
          duration: 5000,
        });
        setIsSubmitting(false);
        return;
      }

      const result = await signupUser({ email: email().trim() });

      if (result.success) {
        setEmailSent(true);
        startCooldown();
        notificationStore.success('Check your inbox for a verification link!', {
          title: 'Email Sent',
          duration: 8000,
        });
      } else {
        const errorMessage = result.error
          ? getErrorMessage(result.error)
          : 'Signup failed. Please try again.';

        notificationStore.error(errorMessage, {
          title: 'Signup Failed',
          duration: 6000,
        });
      }
    } catch (err: any) {
      notificationStore.error('An unexpected error occurred', {
        title: 'Signup Failed',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsSubmitting(true);
    const result = await signupUser({ email: email().trim() });

    if (result.success) {
      startCooldown();
      notificationStore.success('Verification email resent!', {
        title: 'Email Resent',
        duration: 5000,
      });
    } else {
      const errorMessage = result.error
        ? getErrorMessage(result.error)
        : 'Failed to resend email. Please try again.';

      notificationStore.error(errorMessage, {
        title: 'Resend Failed',
        duration: 6000,
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-bg-app px-4 py-8">
      <div class="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 class="text-2xl font-bold text-text-primary">Create Account</h1>
            <p class="mt-1 text-sm text-text-secondary">
              Enter your email to get started with Store Manager
            </p>
          </CardHeader>
          <CardBody>
            <Show
              when={!emailSent()}
              fallback={
                <div class="space-y-4 text-center">
                  <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-success-subtle">
                    <svg
                      class="h-8 w-8 text-accent-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h2 class="text-lg font-semibold text-text-primary">
                    Check your email
                  </h2>
                  <p class="text-sm text-text-secondary">
                    We sent a verification link to{' '}
                    <span class="font-medium text-text-primary">{email()}</span>
                    .
                    <br />
                    Click the link to complete your registration.
                  </p>
                  <p class="text-xs text-text-muted">
                    The link expires in 72 hours.
                  </p>
                  <div class="pt-2">
                    <button
                      type="button"
                      class="text-sm font-medium text-text-link hover:text-text-link-hover disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handleResend}
                      disabled={isSubmitting() || resendCooldown() > 0}
                    >
                      {isSubmitting()
                        ? 'Sending...'
                        : resendCooldown() > 0
                          ? `Resend available in ${resendCooldown()}s`
                          : "Didn't get the email? Resend"}
                    </button>
                  </div>
                </div>
              }
            >
              <form onSubmit={handleSubmit} class="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  required
                  disabled={isSubmitting()}
                />

                <Button
                  type="submit"
                  fullWidth
                  disabled={isSubmitting()}
                  variant="primary"
                >
                  {isSubmitting() ? 'Sending...' : 'Continue with Email'}
                </Button>

                <div class="text-center text-sm text-text-secondary">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    class="font-medium text-text-link hover:text-text-link-hover"
                  >
                    Sign in
                  </a>
                </div>
              </form>
            </Show>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
