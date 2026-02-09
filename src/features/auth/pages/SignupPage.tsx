import { createSignal, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { signup } from '../api/auth.api';
import type { AppError } from '@/shared/types/api.types';
import { setUser, setStatus, user, status, isInitialized } from '../store/session.store';
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

  // Calculate max birth date (must be at least 18 years old)
  const getMaxBirthDate = () => {
    const today = new Date();
    const maxDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );
    return maxDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = createSignal({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
    birthDate: '',
    business: '', // Business ID - optional
  });
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = formData();

      // Basic validation
      if (!data.email || !data.password || !data.name || !data.birthDate) {
        notificationStore.warning('Please fill in all required fields', {
          title: 'Validation Error',
          duration: 5000,
        });
        setIsSubmitting(false);
        return;
      }

      if (data.password.length < 8) {
        notificationStore.warning(
          'Password must be at least 8 characters long',
          {
            title: 'Validation Error',
            duration: 5000,
          }
        );
        setIsSubmitting(false);
        return;
      }

      // Password strength validation to match backend
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(data.password)) {
        notificationStore.warning(
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
          {
            title: 'Validation Error',
            duration: 5000,
          }
        );
        setIsSubmitting(false);
        return;
      }

      // Age validation (must be at least 18 years old)
      const birthDate = new Date(data.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const dayDiff = today.getDate() - birthDate.getDate();

      if (
        age < 18 ||
        (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))
      ) {
        notificationStore.warning(
          'You must be at least 18 years old to sign up',
          {
            title: 'Validation Error',
            duration: 5000,
          }
        );
        setIsSubmitting(false);
        return;
      }

      const response = await signup({
        email: data.email,
        password: data.password,
        name: data.name,
        phoneNumber: data.phoneNumber || undefined,
        birthDate: data.birthDate,
        business: data.business || undefined,
      });

      // Update session store with the logged-in user
      setUser(response.user);
      setStatus('authenticated');

      // Show success notification
      notificationStore.success(
        'Your account has been created successfully! Redirecting...',
        {
          title: 'Signup Successful',
          duration: 5000,
        }
      );

      // Signup successful - navigate to home after brief delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      const appError = err as AppError;
      const errorMessage = getErrorMessage(appError);

      notificationStore.error(errorMessage, {
        title: 'Signup Failed',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div class="w-full max-w-md">
        <Card>
          <CardHeader>
            <h1 class="text-2xl font-bold text-gray-900">Create Account</h1>
            <p class="mt-1 text-sm text-gray-600">
              Sign up to get started with Store Manager
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} class="space-y-4">
              <Input
                type="text"
                label="Full Name"
                placeholder="John Doe"
                value={formData().name}
                onInput={(e) => updateField('name', e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={formData().email}
                onInput={(e) => updateField('email', e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={formData().password}
                onInput={(e) => updateField('password', e.currentTarget.value)}
                required
                disabled={isSubmitting()}
                helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              />

              <Input
                type="date"
                label="Birth Date"
                value={formData().birthDate}
                onInput={(e) => updateField('birthDate', e.currentTarget.value)}
                required
                disabled={isSubmitting()}
                max={getMaxBirthDate()}
                helperText="You must be at least 18 years old"
              />

              <Input
                type="text"
                label="Business ID (Optional)"
                placeholder="Enter your business ID"
                value={formData().business}
                onInput={(e) => updateField('business', e.currentTarget.value)}
                disabled={isSubmitting()}
                helperText="Optional: Contact your admin if you have a business ID"
              />

              <Input
                type="tel"
                label="Phone Number (Optional)"
                placeholder="+1234567890"
                value={formData().phoneNumber}
                onInput={(e) =>
                  updateField('phoneNumber', e.currentTarget.value)
                }
                disabled={isSubmitting()}
              />

              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting()}
                variant="primary"
              >
                {isSubmitting() ? 'Creating account...' : 'Sign Up'}
              </Button>

              <div class="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a
                  href="/login"
                  class="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </a>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
