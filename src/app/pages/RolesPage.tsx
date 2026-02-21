/**
 * Roles & Access Page
 *
 * Dedicated page for managing custom roles and assigning
 * roles + storehouses to team members.
 *
 * Two tabs:
 *   1. Roles    — CRUD for custom roles (reuses RoleManager component)
 *   2. Team     — List business users, assign roles & storehouses
 */

import { createSignal, createResource, Show, For } from 'solid-js';
import { Card, CardBody, CardHeader, Button } from '@/shared/ui';
import RoleManager from '@/shared/components/RoleManager';
import { can } from '@/shared/stores/permissions.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getBusinessUsers, type BusinessUser } from '@/shared/api/users.api';
import {
  getRoles,
  assignRolesToUser,
  assignStorehousesToUser,
} from '@/shared/api/roles.api';
import { getStorehouses } from '@/shared/api/storehouses.api';

type Tab = 'roles' | 'team';

export default function RolesPage() {
  const [activeTab, setActiveTab] = createSignal<Tab>('roles');

  return (
    <div class="py-6">
      {/* Header */}
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-text-primary">Roles & Access</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Manage custom roles and assign permissions to your team
        </p>
      </div>

      {/* Tab bar */}
      <div class="mb-6 flex gap-1 rounded-lg border border-border-default bg-bg-surface p-1">
        <button
          class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          classList={{
            'bg-accent-primary text-text-inverse': activeTab() === 'roles',
            'text-text-secondary hover:text-text-primary hover:bg-bg-hover':
              activeTab() !== 'roles',
          }}
          onClick={() => setActiveTab('roles')}
        >
          <div class="flex items-center justify-center gap-2">
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Roles
          </div>
        </button>
        <button
          class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          classList={{
            'bg-accent-primary text-text-inverse': activeTab() === 'team',
            'text-text-secondary hover:text-text-primary hover:bg-bg-hover':
              activeTab() !== 'team',
          }}
          onClick={() => setActiveTab('team')}
        >
          <div class="flex items-center justify-center gap-2">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Team
          </div>
        </button>
      </div>

      {/* Tab content */}
      <Show when={activeTab() === 'roles'}>
        <RoleManager />
      </Show>

      <Show when={activeTab() === 'team'}>
        <TeamPanel />
      </Show>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Team Panel — User role & storehouse assignment
// ─────────────────────────────────────────────────────────────

function TeamPanel() {
  const [users, { refetch: refetchUsers }] = createResource(() =>
    getBusinessUsers()
  );
  const [roles] = createResource(() => getRoles());
  const [storehouses] = createResource(() => getStorehouses());

  // Editing state
  const [editingUserId, setEditingUserId] = createSignal<string | null>(null);
  const [selectedRoles, setSelectedRoles] = createSignal<string[]>([]);
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<string[]>(
    []
  );
  const [isSaving, setIsSaving] = createSignal(false);

  // Role lookup helper
  function roleName(roleId: string): string {
    const r = (roles() || []).find((r) => r._id === roleId);
    return r?.name || 'Unknown';
  }

  // Storehouse lookup helper
  function storehouseName(shId: string): string {
    const s = (storehouses() || []).find((s) => s.id === shId);
    return s?.name || 'Unknown';
  }

  // Start editing a user
  function startEdit(user: BusinessUser) {
    setEditingUserId(user._id);
    setSelectedRoles([...user.accessRole]);
    setSelectedStorehouses([...user.storeHouses]);
  }

  function cancelEdit() {
    setEditingUserId(null);
  }

  // Toggle a role in the selection
  function toggleRole(roleId: string) {
    const current = selectedRoles();
    if (current.includes(roleId)) {
      setSelectedRoles(current.filter((id) => id !== roleId));
    } else {
      setSelectedRoles([...current, roleId]);
    }
  }

  // Toggle a storehouse in the selection
  function toggleStorehouse(shId: string) {
    const current = selectedStorehouses();
    if (current.includes(shId)) {
      setSelectedStorehouses(current.filter((id) => id !== shId));
    } else {
      setSelectedStorehouses([...current, shId]);
    }
  }

  // Save role + storehouse assignments
  async function handleSave(userId: string) {
    setIsSaving(true);
    try {
      await assignRolesToUser(userId, selectedRoles());
      await assignStorehousesToUser(userId, selectedStorehouses());
      notificationStore.success('User access updated');
      setEditingUserId(null);
      refetchUsers();
    } catch (err: any) {
      notificationStore.error(err?.message || 'Failed to update user access');
    } finally {
      setIsSaving(false);
    }
  }

  // App role badge
  function roleBadge(appRole: string) {
    const colors: Record<string, string> = {
      dev: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      admin:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      user: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    };
    return (
      <span
        class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[appRole] || colors['user']}`}
      >
        {appRole}
      </span>
    );
  }

  const canAssignRoles = () => can('roles', 'execute');
  const canAssignStorehouses = () => can('users', 'update');
  const canEdit = () => canAssignRoles() || canAssignStorehouses();

  return (
    <Card>
      <CardHeader>
        <div>
          <h2 class="text-lg font-semibold text-text-primary">Team Members</h2>
          <p class="mt-1 text-sm text-text-secondary">
            Assign roles and storehouse access to your team
          </p>
        </div>
      </CardHeader>
      <CardBody>
        <Show
          when={!users.loading}
          fallback={
            <div class="space-y-3">
              <For each={[1, 2, 3]}>
                {() => (
                  <div class="bg-bg-subtle h-20 animate-pulse rounded-lg border border-border-default" />
                )}
              </For>
            </div>
          }
        >
          <Show
            when={(users() || []).length > 0}
            fallback={
              <p class="py-8 text-center text-sm text-text-muted">
                No users found.
              </p>
            }
          >
            <div class="space-y-3">
              <For each={users()}>
                {(user) => (
                  <Show
                    when={editingUserId() === user._id}
                    fallback={
                      /* ─── Display Row ─── */
                      <div class="rounded-lg border border-border-default bg-bg-surface p-4 transition-colors hover:bg-bg-hover">
                        <div class="flex items-start justify-between">
                          <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary text-sm font-semibold text-text-inverse">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 class="text-sm font-semibold text-text-primary">
                                  {user.name}
                                </h3>
                                <p class="text-xs text-text-secondary">
                                  {user.email}
                                </p>
                              </div>
                              {roleBadge(user.appRole)}
                            </div>

                            {/* Current assignments */}
                            <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 pl-10">
                              <div class="text-xs text-text-secondary">
                                <span class="font-medium">Roles: </span>
                                <Show
                                  when={user.accessRole.length > 0}
                                  fallback={
                                    <span class="italic text-text-muted">
                                      None
                                    </span>
                                  }
                                >
                                  <For each={user.accessRole}>
                                    {(roleId, i) => (
                                      <>
                                        <span class="text-text-primary">
                                          {roleName(roleId)}
                                        </span>
                                        {i() < user.accessRole.length - 1 &&
                                          ', '}
                                      </>
                                    )}
                                  </For>
                                </Show>
                              </div>
                              <div class="text-xs text-text-secondary">
                                <span class="font-medium">Storehouses: </span>
                                <Show
                                  when={user.storeHouses.length > 0}
                                  fallback={
                                    <span class="italic text-text-muted">
                                      All (admin)
                                    </span>
                                  }
                                >
                                  <For each={user.storeHouses}>
                                    {(shId, i) => (
                                      <>
                                        <span class="text-text-primary">
                                          {storehouseName(shId)}
                                        </span>
                                        {i() < user.storeHouses.length - 1 &&
                                          ', '}
                                      </>
                                    )}
                                  </For>
                                </Show>
                              </div>
                            </div>
                          </div>

                          {/* Edit button — only for regular users, and only if current user can assign */}
                          <Show when={user.appRole === 'user' && canEdit()}>
                            <button
                              onClick={() => startEdit(user)}
                              class="hover:bg-bg-subtle ml-3 rounded-md p-1.5 text-text-secondary hover:text-text-primary"
                              title="Edit access"
                            >
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                          </Show>
                        </div>
                      </div>
                    }
                  >
                    {/* ─── Edit Form ─── */}
                    <div class="border-accent-primary/30 bg-accent-primary/5 rounded-lg border-2 p-4">
                      <div class="mb-3 flex items-center gap-2">
                        <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary text-sm font-semibold text-text-inverse">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 class="text-sm font-semibold text-text-primary">
                            {user.name}
                          </h3>
                          <p class="text-xs text-text-secondary">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Role selection */}
                        <Show when={canAssignRoles()}>
                          <div>
                            <label class="mb-2 block text-xs font-semibold text-text-primary">
                              Assigned Roles
                            </label>
                            <Show
                              when={
                                !roles.loading && (roles() || []).length > 0
                              }
                              fallback={
                                <p class="text-xs italic text-text-muted">
                                  No roles defined yet
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
                                      >
                                        <div
                                          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                                          classList={{
                                            'border-accent-primary bg-accent-primary':
                                              isSelected(),
                                            'border-border-default':
                                              !isSelected(),
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
                                          <span class="font-medium">
                                            {role.name}
                                          </span>
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

                        {/* Storehouse selection */}
                        <Show when={canAssignStorehouses()}>
                          <div>
                            <label class="mb-2 block text-xs font-semibold text-text-primary">
                              Storehouse Access
                            </label>
                            <p class="mb-2 text-xs text-text-muted">
                              Leave empty to deny all storehouse access.
                            </p>
                            <Show
                              when={
                                !storehouses.loading &&
                                (storehouses() || []).length > 0
                              }
                              fallback={
                                <p class="text-xs italic text-text-muted">
                                  No storehouses found
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
                                      >
                                        <div
                                          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
                                          classList={{
                                            'border-accent-primary bg-accent-primary':
                                              isSelected(),
                                            'border-border-default':
                                              !isSelected(),
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
                                          <span class="font-medium">
                                            {sh.name}
                                          </span>
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
                        </Show>
                      </div>

                      {/* Actions */}
                      <div class="mt-4 flex gap-2 border-t border-border-subtle pt-3">
                        <Button
                          variant="primary"
                          onClick={() => handleSave(user._id)}
                          disabled={isSaving()}
                        >
                          {isSaving() ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Show>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </CardBody>
    </Card>
  );
}
