import { createSignal } from 'solid-js';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { forgotPassword } from '../api/auth.api';
import { notificationStore } from '@/shared/stores/notification.store';

export default function ForgotPasswordPage() {
  const [email, setEmail] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await forgotPassword({ email: email() });
      setSubmitted(true);
    } catch (error) {
      notificationStore.error('Something went wrong. Please try again later.', {
        title: 'Error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-bg-app px-4">
      <div class="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 class="text-2xl font-bold text-text-primary">
              Forgot Password
            </h1>
            <p class="mt-1 text-sm text-text-secondary">
              Enter your email and we'll send you a link to reset your password
            </p>
          </CardHeader>
          <CardBody>
            {submitted() ? (
              <div class="space-y-4">
                <div class="rounded-lg bg-accent-success-subtle p-4">
                  <p class="text-sm text-accent-success">
                    If an account with that email exists, a password reset link
                    has been sent. Please check your inbox.
                  </p>
                </div>
                <div class="text-center text-sm text-text-secondary">
                  <a
                    href="/login"
                    class="font-medium text-text-link hover:text-text-link-hover"
                  >
                    Back to Sign In
                  </a>
                </div>
              </div>
            ) : (
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
                  {isSubmitting() ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <div class="mt-4 text-center text-sm text-text-secondary">
                  Remember your password?{' '}
                  <a
                    href="/login"
                    class="font-medium text-text-link hover:text-text-link-hover"
                  >
                    Sign in
                  </a>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
