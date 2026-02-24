import { createSignal, Show } from 'solid-js';
import { Input, Button, Alert } from '@/shared/ui';
import { changePassword } from '@/features/auth/api/auth.api';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel: () => void;
}

export function ChangePasswordForm(props: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = createSignal('');
  const [newPassword, setNewPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [logoutOtherSessions, setLogoutOtherSessions] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword() !== confirmPassword()) {
      setError('New passwords do not match.');
      return;
    }

    // Validate password strength
    if (newPassword().length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword())) {
      setError(
        'New password must contain at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }

    // Ensure new password differs from current
    if (currentPassword() === newPassword()) {
      setError('New password must be different from your current password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword: currentPassword(),
        newPassword: newPassword(),
        logoutOtherSessions: logoutOtherSessions(),
      });

      notificationStore.success(
        logoutOtherSessions()
          ? 'Your password has been changed. Other sessions have been logged out.'
          : 'Your password has been changed.',
        { title: 'Password Changed' }
      );

      // Reset form and close
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLogoutOtherSessions(true);
      props.onSuccess?.();
    } catch (err: any) {
      const rcode = err?.data?.rcode;
      if (rcode === 4009) {
        setError('Current password is incorrect.');
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <Input
        type="password"
        label="Current Password"
        placeholder="••••••••"
        value={currentPassword()}
        onInput={(e) => setCurrentPassword(e.currentTarget.value)}
        required
        disabled={isSubmitting()}
      />

      <Input
        type="password"
        label="New Password"
        placeholder="••••••••"
        value={newPassword()}
        onInput={(e) => setNewPassword(e.currentTarget.value)}
        required
        disabled={isSubmitting()}
      />

      <Input
        type="password"
        label="Confirm New Password"
        placeholder="••••••••"
        value={confirmPassword()}
        onInput={(e) => setConfirmPassword(e.currentTarget.value)}
        required
        disabled={isSubmitting()}
      />

      <p class="text-xs text-text-secondary">
        Must be at least 8 characters with one uppercase letter, one lowercase
        letter, and one number.
      </p>

      <label class="flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={logoutOtherSessions()}
          onChange={(e) => setLogoutOtherSessions(e.currentTarget.checked)}
          disabled={isSubmitting()}
          class="rounded border-border-default"
        />
        Log out of all other devices
      </label>

      <div class="flex gap-3">
        <Button type="submit" disabled={isSubmitting()}>
          {isSubmitting() ? 'Changing...' : 'Change Password'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={props.onCancel}
          disabled={isSubmitting()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
