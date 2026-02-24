import { createSignal, createResource, Show, Suspense } from 'solid-js';
import { Button, Alert } from '@/shared/ui';
import * as profileApi from '../api/profile.api';
import { ProfileCard } from '../components/ProfileCard';
import { ProfileInfo } from '../components/ProfileInfo';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import type { UpdateProfileRequest } from '../types/profile.types';
import { getErrorMessage } from '@/shared/lib/error-messages';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [isChangingPassword, setIsChangingPassword] = createSignal(false);

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
        <h1 class="text-3xl font-bold text-text-primary">Profile</h1>
        <p class="mt-2 text-sm text-text-secondary">
          View and manage your account information
        </p>
      </div>

      <Suspense
        fallback={
          <ProfileCard title="Loading...">
            <div class="text-text-muted">Loading profile...</div>
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

      {/* Security Section */}
      <div class="mt-6">
        <ProfileCard title="Security">
          <Show
            when={isChangingPassword()}
            fallback={
              <div>
                <p class="mb-4 text-sm text-text-secondary">
                  Update your password to keep your account secure.
                </p>
                <Button onClick={() => setIsChangingPassword(true)}>
                  Change Password
                </Button>
              </div>
            }
          >
            <ChangePasswordForm
              onSuccess={() => setIsChangingPassword(false)}
              onCancel={() => setIsChangingPassword(false)}
            />
          </Show>
        </ProfileCard>
      </div>
    </div>
  );
}
