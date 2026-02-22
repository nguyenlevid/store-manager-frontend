import { createSignal, createResource, Show, For } from 'solid-js';
import { Card, CardHeader, CardBody, Input, Button } from '@/shared/ui';
import { inviteUser } from '../api/team.api';
import { getRoles } from '@/shared/api/roles.api';
import { getStorehouses } from '@/shared/api/storehouses.api';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage } from '@/shared/lib/error-messages';

interface InviteUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteUserModal(props: InviteUserModalProps) {
  const [email, setEmail] = createSignal('');
  const [makeAdmin, setMakeAdmin] = createSignal(false);
  const [selectedRoles, setSelectedRoles] = createSignal<string[]>([]);
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<string[]>(
    []
  );
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const [roles] = createResource(() => getRoles());
  const [storehouses] = createResource(() => getStorehouses());

  function toggleRole(roleId: string) {
    const current = selectedRoles();
    if (current.includes(roleId)) {
      setSelectedRoles(current.filter((id) => id !== roleId));
    } else {
      setSelectedRoles([...current, roleId]);
    }
  }

  function toggleStorehouse(shId: string) {
    const current = selectedStorehouses();
    if (current.includes(shId)) {
      setSelectedStorehouses(current.filter((id) => id !== shId));
    } else {
      setSelectedStorehouses([...current, shId]);
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await inviteUser({
        email: email(),
        appRole: makeAdmin() ? 'admin' : 'user',
        roleIds:
          !makeAdmin() && selectedRoles().length > 0
            ? selectedRoles()
            : undefined,
        storeHouseIds:
          selectedStorehouses().length > 0 ? selectedStorehouses() : undefined,
      });

      notificationStore.success(`Invitation sent to ${email()}.`, {
        title: 'Invitation Sent',
      });
      props.onSuccess();
    } catch (err: any) {
      const errorMessage = err?.data?.rcode
        ? getErrorMessage({ code: err.data.rcode })
        : 'Failed to send invitation. Please try again.';

      notificationStore.error(errorMessage, { title: 'Invitation Failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="w-full max-w-lg">
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-bold text-text-primary">
                Invite Team Member
              </h2>
              <button
                onClick={props.onClose}
                class="rounded-lg p-1 text-text-secondary hover:bg-bg-hover"
                aria-label="Close"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} class="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="colleague@example.com"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
                disabled={isSubmitting()}
              />

              {/* Admin toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setMakeAdmin(!makeAdmin())}
                  class="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  classList={{
                    'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20':
                      makeAdmin(),
                    'border-border-default bg-bg-surface hover:border-border-hover':
                      !makeAdmin(),
                  }}
                  disabled={isSubmitting()}
                >
                  <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors"
                    classList={{
                      'border-amber-500 bg-amber-500': makeAdmin(),
                      'border-border-default': !makeAdmin(),
                    }}
                  >
                    <Show when={makeAdmin()}>
                      <svg
                        class="h-3.5 w-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="3"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </Show>
                  </div>
                  <div>
                    <span class="font-medium text-text-primary">
                      Make Admin
                    </span>
                    <p class="text-xs text-text-secondary">
                      Admins can manage team members, roles, and settings
                    </p>
                  </div>
                </button>
              </div>

              {/* Storehouse access */}
              <div>
                <label class="mb-1.5 block text-sm font-medium text-text-primary">
                  Storehouse Access
                </label>
                <Show
                  when={
                    !storehouses.loading && (storehouses() || []).length > 0
                  }
                  fallback={
                    <p class="text-xs italic text-text-muted">
                      {storehouses.loading
                        ? 'Loading storehouses...'
                        : 'No storehouses found'}
                    </p>
                  }
                >
                  <div class="space-y-1.5">
                    <For each={storehouses()}>
                      {(sh) => {
                        const isSelected = () =>
                          selectedStorehouses().includes(sh.id);
                        return (
                          <button
                            type="button"
                            onClick={() => toggleStorehouse(sh.id)}
                            class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors"
                            classList={{
                              'border-accent-primary bg-accent-primary/10 text-accent-primary':
                                isSelected(),
                              'border-border-default bg-bg-surface text-text-secondary hover:border-border-hover':
                                !isSelected(),
                            }}
                            disabled={isSubmitting()}
                          >
                            <div
                              class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                              classList={{
                                'border-accent-primary bg-accent-primary':
                                  isSelected(),
                                'border-border-default': !isSelected(),
                              }}
                            >
                              <Show when={isSelected()}>
                                <svg
                                  class="h-3 w-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </Show>
                            </div>
                            <div>
                              <span class="font-medium">{sh.name}</span>
                              <Show when={sh.address}>
                                <span class="ml-1 text-text-muted">
                                  — {sh.address}
                                </span>
                              </Show>
                            </div>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Custom roles — only shown when NOT admin */}
              <Show when={!makeAdmin()}>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Assign Roles
                  </label>
                  <Show
                    when={!roles.loading && (roles() || []).length > 0}
                    fallback={
                      <p class="text-xs italic text-text-muted">
                        {roles.loading
                          ? 'Loading roles...'
                          : 'No custom roles defined yet. You can assign them later.'}
                      </p>
                    }
                  >
                    <div class="space-y-1.5">
                      <For each={roles()}>
                        {(role) => {
                          const isSelected = () =>
                            selectedRoles().includes(role._id);
                          return (
                            <button
                              type="button"
                              onClick={() => toggleRole(role._id)}
                              class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors"
                              classList={{
                                'border-accent-primary bg-accent-primary/10 text-accent-primary':
                                  isSelected(),
                                'border-border-default bg-bg-surface text-text-secondary hover:border-border-hover':
                                  !isSelected(),
                              }}
                              disabled={isSubmitting()}
                            >
                              <div
                                class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                                classList={{
                                  'border-accent-primary bg-accent-primary':
                                    isSelected(),
                                  'border-border-default': !isSelected(),
                                }}
                              >
                                <Show when={isSelected()}>
                                  <svg
                                    class="h-3 w-3 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="3"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </Show>
                              </div>
                              <div>
                                <span class="font-medium">{role.name}</span>
                                <Show when={role.description}>
                                  <span class="ml-1 text-text-muted">
                                    — {role.description}
                                  </span>
                                </Show>
                              </div>
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </Show>
                </div>
              </Show>

              <div class="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={props.onClose}
                  disabled={isSubmitting()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={isSubmitting()}
                >
                  {isSubmitting() ? 'Sending...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
