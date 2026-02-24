import type { Profile } from '../types/profile.types';

interface ProfileInfoProps {
  profile: Profile;
}

export function ProfileInfo(props: ProfileInfoProps) {
  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-secondary">
          Name
        </label>
        <p class="mt-1 text-sm text-text-primary">{props.profile.name}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary">
          Email
        </label>
        <p class="mt-1 text-sm text-text-primary">{props.profile.email}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-secondary">
          Role
        </label>
        <p class="mt-1 text-sm capitalize text-text-primary">
          {props.profile.role}
        </p>
      </div>

      {props.profile.phone && (
        <div>
          <label class="block text-sm font-medium text-text-secondary">
            Phone
          </label>
          <p class="mt-1 text-sm text-text-primary">{props.profile.phone}</p>
        </div>
      )}

      {props.profile.department && (
        <div>
          <label class="block text-sm font-medium text-text-secondary">
            Department
          </label>
          <p class="mt-1 text-sm text-text-primary">
            {props.profile.department}
          </p>
        </div>
      )}
    </div>
  );
}
