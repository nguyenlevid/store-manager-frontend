import { createSignal } from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { loginUser } from '../store/session.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await loginUser(email(), password());

    if (result.success) {
      notificationStore.success(
        'Welcome back! You have successfully logged in.',
        {
          title: 'Login Successful',
        }
      );

      const redirectParam = searchParams['redirect'];
      const redirect = Array.isArray(redirectParam)
        ? redirectParam[0]
        : redirectParam || '/';
      navigate(redirect || '/');
    } else {
      const errorMessage = result.error
        ? getErrorMessage(result.error)
        : 'Login failed. Please try again.';

      notificationStore.error(errorMessage, {
        title: 'Login Failed',
        duration: 6000,
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div class="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 class="text-2xl font-bold text-gray-900">Sign In</h1>
            <p class="mt-1 text-sm text-gray-600">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          <CardBody>
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

              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting()}
                variant="primary"
              >
                {isSubmitting() ? 'Signing in...' : 'Sign In'}
              </Button>

              <div class="mt-4 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <a
                  href="/signup"
                  class="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </a>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
