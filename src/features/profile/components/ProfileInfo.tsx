import type { Profile } from '../types/profile.types';

interface ProfileInfoProps {
  profile: Profile;
}

export function ProfileInfo(props: ProfileInfoProps) {
  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Name</label>
        <p class="mt-1 text-sm text-gray-900">{props.profile.name}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <p class="mt-1 text-sm text-gray-900">{props.profile.email}</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Role</label>
        <p class="mt-1 text-sm capitalize text-gray-900">
          {props.profile.role}
        </p>
      </div>

      {props.profile.phone && (
        <div>
          <label class="block text-sm font-medium text-gray-700">Phone</label>
          <p class="mt-1 text-sm text-gray-900">{props.profile.phone}</p>
        </div>
      )}

      {props.profile.department && (
        <div>
          <label class="block text-sm font-medium text-gray-700">
            Department
          </label>
          <p class="mt-1 text-sm text-gray-900">{props.profile.department}</p>
        </div>
      )}
    </div>
  );
}
