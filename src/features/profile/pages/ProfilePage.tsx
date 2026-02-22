import { createSignal, createResource, Show, Suspense } from 'solid-js';
import { Button, Alert } from '@/shared/ui';
import * as profileApi from '../api/profile.api';
import { ProfileCard } from '../components/ProfileCard';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileEditForm } from '../components/ProfileEditForm';
import type { UpdateProfileRequest } from '../types/profile.types';
import { getErrorMessage } from '@/shared/lib/error-messages';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);

  // Load profile data
  const [profile, { refetch }] = createResource(() => profileApi.getProfile());

  const handleSave = async (data: UpdateProfileRequest) => {
    setIsSaving(true);
    try {
      await profileApi.updateProfile(data);
      await refetch();
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div class="mx-auto max-w-4xl px-4 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Profile</h1>
        <p class="mt-2 text-sm text-gray-600">
          View and manage your account information
        </p>
      </div>

      <Suspense
        fallback={
          <ProfileCard title="Loading...">
            <div class="text-gray-500">Loading profile...</div>
          </ProfileCard>
        }
      >
        <Show when={profile.error}>
          <Alert variant="error" title="Error loading profile">
            {getErrorMessage(profile.error)}
          </Alert>
        </Show>

        <Show when={profile()}>
          {(profileData) => (
            <ProfileCard title="Personal Information">
              <Show
                when={isEditing()}
                fallback={
                  <>
                    <ProfileInfo profile={profileData()} />
                    <div class="mt-6">
                      <Button onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    </div>
                  </>
                }
              >
                <ProfileEditForm
                  profile={profileData()}
                  onSave={handleSave}
                  onCancel={() => setIsEditing(false)}
                  isSaving={isSaving()}
                />
              </Show>
            </ProfileCard>
          )}
        </Show>
      </Suspense>
    </div>
  );
}
