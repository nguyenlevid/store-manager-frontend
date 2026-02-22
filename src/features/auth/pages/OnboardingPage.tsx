import {
  createSignal,
  createEffect,
  Show,
  Switch,
  Match,
  onMount,
} from 'solid-js';
import { useNavigate, useSearchParams } from '@solidjs/router';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { verifyToken } from '../api/auth.api';
import {
  completeRegistrationUser,
  completeInvitationUser,
  user,
  status,
  isInitialized,
} from '../store/session.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Token from URL
  const token = (): string => {
    const t = searchParams['token'];
    return (Array.isArray(t) ? t[0] : t) ?? '';
  };

  // Page state
  const [loading, setLoading] = createSignal(true);
  const [tokenValid, setTokenValid] = createSignal(false);
  const [tokenEmail, setTokenEmail] = createSignal('');
  const [tokenError, setTokenError] = createSignal('');
  const [accountType, setAccountType] = createSignal<
    'self_registered' | 'invited'
  >('self_registered');
  const [businessName_invite, setBusinessName_invite] = createSignal('');
  const [step, setStep] = createSignal<Step>(1);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Redirect if already authenticated
  createEffect(() => {
    if (isInitialized() && status() === 'authenticated' && user()) {
      navigate('/', { replace: true });
    }
  });

  // Step 1: Personal details
  const [name, setName] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [phoneNumber, setPhoneNumber] = createSignal('');
  const [birthDate, setBirthDate] = createSignal('');

  // Step 2: Business details
  const [businessName, setBusinessName] = createSignal('');
  const [businessAddress, setBusinessAddress] = createSignal('');
  const [businessPhone, setBusinessPhone] = createSignal('');
  const [businessEmail, setBusinessEmail] = createSignal('');

  // Step 3: Storehouse details
  const [storeHouseName, setStoreHouseName] = createSignal('');
  const [storeHouseAddress, setStoreHouseAddress] = createSignal('');
  const [storeHousePhone, setStoreHousePhone] = createSignal('');
  const [storeHouseEmail, setStoreHouseEmail] = createSignal('');

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

  // Verify token on mount
  onMount(async () => {
    const t = token();
    if (!t) {
      setTokenError(
        'No verification token provided. Please check your email link.'
      );
      setLoading(false);
      return;
    }

    try {
      const result = await verifyToken(t);
      setTokenEmail(result.email);
      if (result.accountType === 'invited') {
        setAccountType('invited');
        setBusinessName_invite(result.businessName || '');
      }
      setTokenValid(true);
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setTokenError(errorMessage || 'Invalid or expired verification link.');
    } finally {
      setLoading(false);
    }
  });

  // Validation helpers
  const validateStep1 = (): boolean => {
    if (!name().trim()) {
      notificationStore.warning('Please enter your name', {
        title: 'Validation',
      });
      return false;
    }
    if (!birthDate()) {
      notificationStore.warning('Please enter your birth date', {
        title: 'Validation',
      });
      return false;
    }

    // Age validation
    const bd = new Date(birthDate());
    const today = new Date();
    const age = today.getFullYear() - bd.getFullYear();
    const monthDiff = today.getMonth() - bd.getMonth();
    const dayDiff = today.getDate() - bd.getDate();
    if (
      age < 18 ||
      (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)))
    ) {
      notificationStore.warning('You must be at least 18 years old', {
        title: 'Validation',
      });
      return false;
    }

    if (!password() || password().length < 8) {
      notificationStore.warning('Password must be at least 8 characters', {
        title: 'Validation',
      });
      return false;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password())) {
      notificationStore.warning(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        { title: 'Validation' }
      );
      return false;
    }

    if (password() !== confirmPassword()) {
      notificationStore.warning('Passwords do not match', {
        title: 'Validation',
      });
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (!businessName().trim()) {
      notificationStore.warning('Please enter a business name', {
        title: 'Validation',
      });
      return false;
    }
    if (!businessAddress().trim()) {
      notificationStore.warning('Please enter a business address', {
        title: 'Validation',
      });
      return false;
    }
    if (!businessPhone().trim()) {
      notificationStore.warning('Please enter a business phone number', {
        title: 'Validation',
      });
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!storeHouseAddress().trim()) {
      notificationStore.warning('Please enter a storehouse address', {
        title: 'Validation',
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step() === 1 && validateStep1()) {
      setStep(2);
    } else if (step() === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step() > 1) {
      setStep((s) => (s - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);

    const result = await completeRegistrationUser({
      token: token(),
      user: {
        name: name().trim(),
        password: password(),
        phoneNumber: phoneNumber().trim() || undefined,
        birthDate: birthDate(),
      },
      business: {
        name: businessName().trim(),
        address: businessAddress().trim(),
        phoneNumber: businessPhone().trim(),
        email: businessEmail().trim() || undefined,
      },
      storeHouse: {
        name: storeHouseName().trim() || undefined,
        address: storeHouseAddress().trim(),
        phoneNumber: storeHousePhone().trim() || undefined,
        email: storeHouseEmail().trim() || undefined,
      },
    });

    if (result.success) {
      notificationStore.success(
        'Your account has been created! Redirecting to dashboard...',
        { title: 'Welcome!', duration: 5000 }
      );
      setTimeout(() => navigate('/', { replace: true }), 1000);
    } else {
      const errorMessage = result.error
        ? getErrorMessage(result.error)
        : 'Registration failed. Please try again.';

      notificationStore.error(errorMessage, {
        title: 'Registration Failed',
        duration: 6000,
      });
    }

    setIsSubmitting(false);
  };

  const handleInvitationSubmit = async () => {
    if (!validateStep1()) return;

    setIsSubmitting(true);

    const result = await completeInvitationUser({
      token: token(),
      user: {
        name: name().trim(),
        password: password(),
        phoneNumber: phoneNumber().trim() || undefined,
        birthDate: birthDate(),
      },
    });

    if (result.success) {
      notificationStore.success(
        `Welcome to ${businessName_invite() || 'the team'}! Redirecting to dashboard...`,
        { title: 'Welcome!', duration: 5000 }
      );
      setTimeout(() => navigate('/', { replace: true }), 1000);
    } else {
      const errorMessage = result.error
        ? getErrorMessage(result.error)
        : 'Registration failed. Please try again.';

      notificationStore.error(errorMessage, {
        title: 'Registration Failed',
        duration: 6000,
      });
    }

    setIsSubmitting(false);
  };

  // Step indicator
  const StepIndicator = () => (
    <div class="mb-6 flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => (
        <div class="flex items-center">
          <div
            class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
              s === step()
                ? 'bg-blue-600 text-white'
                : s < step()
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {s < step() ? (
              <svg
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              s
            )}
          </div>
          {s < 3 && (
            <div
              class={`mx-1 h-0.5 w-8 ${
                s < step() ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const stepLabels = ['Personal Details', 'Business Info', 'Storehouse'];

  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div class="w-full max-w-lg">
        {/* Loading state */}
        <Show when={loading()}>
          <Card>
            <CardBody>
              <div class="flex flex-col items-center gap-3 py-8">
                <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p class="text-sm text-gray-600">Verifying your link...</p>
              </div>
            </CardBody>
          </Card>
        </Show>

        {/* Token error */}
        <Show when={!loading() && !tokenValid()}>
          <Card>
            <CardBody>
              <div class="space-y-4 py-8 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <svg
                    class="h-8 w-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 class="text-lg font-semibold text-gray-900">
                  Invalid Verification Link
                </h2>
                <p class="text-sm text-gray-600">{tokenError()}</p>
                <div class="flex flex-col items-center gap-2">
                  <Button variant="primary" onClick={() => navigate('/signup')}>
                    Sign Up Again
                  </Button>
                  <a
                    href="/login"
                    class="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Already have an account? Sign in
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>
        </Show>

        {/* Wizard */}
        <Show when={!loading() && tokenValid()}>
          <Switch>
            {/* Invited user — single-step form */}
            <Match when={accountType() === 'invited'}>
              <Card>
                <CardHeader>
                  <h1 class="text-2xl font-bold text-gray-900">
                    Join {businessName_invite() || 'Your Team'}
                  </h1>
                  <p class="mt-1 text-sm text-gray-600">
                    Complete your profile for{' '}
                    <span class="font-medium text-gray-900">
                      {tokenEmail()}
                    </span>
                  </p>
                </CardHeader>
                <CardBody>
                  <div class="space-y-4">
                    <Input
                      type="text"
                      label="Full Name"
                      placeholder="John Doe"
                      value={name()}
                      onInput={(e) => setName(e.currentTarget.value)}
                      required
                    />

                    <Input
                      type="date"
                      label="Birth Date"
                      value={birthDate()}
                      onInput={(e) => setBirthDate(e.currentTarget.value)}
                      required
                      max={getMaxBirthDate()}
                      helperText="You must be at least 18 years old"
                    />

                    <Input
                      type="tel"
                      label="Phone Number (Optional)"
                      placeholder="+1234567890"
                      value={phoneNumber()}
                      onInput={(e) => setPhoneNumber(e.currentTarget.value)}
                    />

                    <Input
                      type="password"
                      label="Password"
                      placeholder="••••••••"
                      value={password()}
                      onInput={(e) => setPassword(e.currentTarget.value)}
                      required
                      helperText="Min 8 chars with uppercase, lowercase, and number"
                    />

                    <Input
                      type="password"
                      label="Confirm Password"
                      placeholder="••••••••"
                      value={confirmPassword()}
                      onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                      required
                    />

                    <Button
                      type="button"
                      fullWidth
                      variant="primary"
                      onClick={handleInvitationSubmit}
                      disabled={isSubmitting()}
                    >
                      {isSubmitting() ? 'Joining...' : 'Join Team'}
                    </Button>
                  </div>

                  <div class="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <a
                      href="/login"
                      class="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </a>
                  </div>
                </CardBody>
              </Card>
            </Match>

            {/* Self-registered user — 3-step wizard */}
            <Match when={accountType() === 'self_registered'}>
              <Card>
                <CardHeader>
                  <h1 class="text-2xl font-bold text-gray-900">
                    Complete Your Registration
                  </h1>
                  <p class="mt-1 text-sm text-gray-600">
                    Setting up account for{' '}
                    <span class="font-medium text-gray-900">
                      {tokenEmail()}
                    </span>
                  </p>
                </CardHeader>
                <CardBody>
                  <StepIndicator />
                  <p class="mb-4 text-center text-sm font-medium text-gray-700">
                    Step {step()}: {stepLabels[step() - 1]}
                  </p>

                  {/* Step 1: Personal Details */}
                  <Switch>
                    <Match when={step() === 1}>
                      <div class="space-y-4">
                        <Input
                          type="text"
                          label="Full Name"
                          placeholder="John Doe"
                          value={name()}
                          onInput={(e) => setName(e.currentTarget.value)}
                          required
                        />

                        <Input
                          type="date"
                          label="Birth Date"
                          value={birthDate()}
                          onInput={(e) => setBirthDate(e.currentTarget.value)}
                          required
                          max={getMaxBirthDate()}
                          helperText="You must be at least 18 years old"
                        />

                        <Input
                          type="tel"
                          label="Phone Number (Optional)"
                          placeholder="+1234567890"
                          value={phoneNumber()}
                          onInput={(e) => setPhoneNumber(e.currentTarget.value)}
                        />

                        <Input
                          type="password"
                          label="Password"
                          placeholder="••••••••"
                          value={password()}
                          onInput={(e) => setPassword(e.currentTarget.value)}
                          required
                          helperText="Min 8 chars with uppercase, lowercase, and number"
                        />

                        <Input
                          type="password"
                          label="Confirm Password"
                          placeholder="••••••••"
                          value={confirmPassword()}
                          onInput={(e) =>
                            setConfirmPassword(e.currentTarget.value)
                          }
                          required
                        />

                        <Button
                          type="button"
                          fullWidth
                          variant="primary"
                          onClick={handleNext}
                        >
                          Next
                        </Button>
                      </div>
                    </Match>

                    {/* Step 2: Business Details */}
                    <Match when={step() === 2}>
                      <div class="space-y-4">
                        <Input
                          type="text"
                          label="Business Name"
                          placeholder="My Store"
                          value={businessName()}
                          onInput={(e) =>
                            setBusinessName(e.currentTarget.value)
                          }
                          required
                        />

                        <Input
                          type="text"
                          label="Business Address"
                          placeholder="123 Main St"
                          value={businessAddress()}
                          onInput={(e) =>
                            setBusinessAddress(e.currentTarget.value)
                          }
                          required
                        />

                        <Input
                          type="tel"
                          label="Business Phone"
                          placeholder="+1 234 567 8900"
                          value={businessPhone()}
                          onInput={(e) =>
                            setBusinessPhone(e.currentTarget.value)
                          }
                          required
                        />

                        <Input
                          type="email"
                          label="Business Email (Optional)"
                          placeholder="contact@mybusiness.com"
                          value={businessEmail()}
                          onInput={(e) =>
                            setBusinessEmail(e.currentTarget.value)
                          }
                        />

                        <div class="flex gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBack}
                            class="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleNext}
                            class="flex-1"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </Match>

                    {/* Step 3: Storehouse Details */}
                    <Match when={step() === 3}>
                      <div class="space-y-4">
                        <Input
                          type="text"
                          label="Storehouse Name (Optional)"
                          placeholder="Main Warehouse"
                          value={storeHouseName()}
                          onInput={(e) =>
                            setStoreHouseName(e.currentTarget.value)
                          }
                        />

                        <Input
                          type="text"
                          label="Storehouse Address"
                          placeholder="456 Warehouse Ave"
                          value={storeHouseAddress()}
                          onInput={(e) =>
                            setStoreHouseAddress(e.currentTarget.value)
                          }
                          required
                        />

                        <Input
                          type="tel"
                          label="Storehouse Phone (Optional)"
                          placeholder="+1 234 567 8901"
                          value={storeHousePhone()}
                          onInput={(e) =>
                            setStoreHousePhone(e.currentTarget.value)
                          }
                        />

                        <Input
                          type="email"
                          label="Storehouse Email (Optional)"
                          placeholder="warehouse@mybusiness.com"
                          value={storeHouseEmail()}
                          onInput={(e) =>
                            setStoreHouseEmail(e.currentTarget.value)
                          }
                        />

                        <div class="flex gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleBack}
                            class="flex-1"
                            disabled={isSubmitting()}
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            onClick={handleSubmit}
                            class="flex-1"
                            disabled={isSubmitting()}
                          >
                            {isSubmitting() ? 'Creating...' : 'Complete Setup'}
                          </Button>
                        </div>
                      </div>
                    </Match>
                  </Switch>

                  <div class="mt-4 text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <a
                      href="/login"
                      class="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </a>
                  </div>
                </CardBody>
              </Card>
            </Match>
          </Switch>
        </Show>
      </div>
    </div>
  );
}
