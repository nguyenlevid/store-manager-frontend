import { createSignal, onMount } from 'solid-js';
import { useSearchParams, useNavigate } from '@solidjs/router';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { resetPassword } from '../api/auth.api';
import { notificationStore } from '@/shared/stores/notification.store';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');
  const [noToken, setNoToken] = createSignal(false);

  onMount(() => {
    const token = Array.isArray(searchParams['token'])
      ? searchParams['token'][0]
      : searchParams['token'];
    if (!token) {
      setNoToken(true);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password() !== confirmPassword()) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (password().length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!passwordRegex.test(password())) {
      setError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }

    const token = Array.isArray(searchParams['token'])
      ? searchParams['token'][0]
      : searchParams['token'];

    if (!token) {
      setError('Reset token is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ token, password: password() });
      notificationStore.success(
        'Your password has been reset successfully. Please log in.',
        { title: 'Password Reset' }
      );
      navigate('/login', { replace: true });
    } catch (err: any) {
      const rcode = err?.data?.rcode;
      if (rcode === 4005 || rcode === 4007) {
        setError(
          'This reset link is invalid or has expired. Please request a new one.'
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (noToken()) {
    return (
      <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div class="w-full max-w-md">
          <Card>
            <CardHeader>
              <h1 class="text-2xl font-bold text-gray-900">Invalid Link</h1>
            </CardHeader>
            <CardBody>
              <p class="mb-4 text-sm text-gray-600">
                This password reset link is invalid or missing a token.
              </p>
              <div class="flex gap-3">
                <a
                  href="/forgot-password"
                  class="font-medium text-blue-600 hover:text-blue-500"
                >
                  Request a new link
                </a>
                <span class="text-gray-300">|</span>
                <a
                  href="/login"
                  class="font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to Sign In
                </a>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div class="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 class="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p class="mt-1 text-sm text-gray-600">
              Enter your new password below
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} class="space-y-4">
              {error() && (
                <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error()}
                </div>
              )}

              <Input
                type="password"
                label="New Password"
                placeholder="••••••••"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              <Input
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting()}
                variant="primary"
              >
                {isSubmitting() ? 'Resetting...' : 'Reset Password'}
              </Button>

              <div class="mt-4 text-center text-sm text-gray-600">
                <a
                  href="/login"
                  class="font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to Sign In
                </a>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
