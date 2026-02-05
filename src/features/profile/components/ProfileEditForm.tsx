import { createSignal, Show } from 'solid-js';
import { Input, Button, Alert } from '@/shared/ui';
import type { Profile, UpdateProfileRequest } from '../types/profile.types';

interface ProfileEditFormProps {
  profile: Profile;
  onSave: (data: UpdateProfileRequest) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export function ProfileEditForm(props: ProfileEditFormProps) {
  const [name, setName] = createSignal(props.profile.name);
  const [phone, setPhone] = createSignal(props.profile.phone || '');
  const [department, setDepartment] = createSignal(
    props.profile.department || ''
  );
  const [error, setError] = createSignal<string>('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    try {
      await props.onSave({
        name: name(),
        phone: phone() || undefined,
        department: department() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <Show when={error()}>
        <Alert variant="error">{error()}</Alert>
      </Show>

      <Input
        label="Name"
        value={name()}
        onInput={(e) => setName(e.currentTarget.value)}
        required
        disabled={props.isSaving}
      />

      <Input
        label="Phone"
        type="tel"
        value={phone()}
        onInput={(e) => setPhone(e.currentTarget.value)}
        disabled={props.isSaving}
      />

      <Input
        label="Department"
        value={department()}
        onInput={(e) => setDepartment(e.currentTarget.value)}
        disabled={props.isSaving}
      />

      <div class="flex gap-3">
        <Button type="submit" disabled={props.isSaving}>
          {props.isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={props.onCancel}
          disabled={props.isSaving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
