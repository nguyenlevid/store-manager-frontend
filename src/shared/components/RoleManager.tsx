/**
 * RoleManager Component
 *
 * Full CRUD for custom roles within the business.
 * Shown in the Settings page. Only visible to users who can manage roles.
 */

import { createSignal, createResource, Show, For } from 'solid-js';
import { Card, CardBody, CardHeader, Button } from '@/shared/ui';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type CustomRole,
  type Permissions,
  type PermissionResource,
} from '@/shared/api/roles.api';
import { isAdmin } from '@/shared/stores/permissions.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage, getErrorTitle } from '@/shared/lib/error-messages';

/**
 * Human-readable labels for permission resources
 */
const RESOURCE_LABELS: Record<PermissionResource, string> = {
  items: 'Inventory Items',
  imports: 'Imports (Purchases)',
  transactions: 'Orders (Sales)',
  transfers: 'Transfers',
  partners: 'Partners',
  storehouses: 'Storehouses',
  businessSettings: 'Business Settings',
  users: 'Users',
};

/**
 * Which actions each resource supports
 */
const RESOURCE_ACTIONS: Record<PermissionResource, string[]> = {
  items: ['create', 'update', 'delete'],
  imports: ['create', 'update', 'delete', 'execute'],
  transactions: ['create', 'update', 'delete', 'execute'],
  transfers: ['create', 'delete', 'execute'],
  partners: ['create', 'update', 'delete'],
  storehouses: ['create', 'update', 'delete'],
  businessSettings: ['update'],
  users: ['create', 'update', 'delete'],
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  execute: 'Execute',
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  create: 'Create new records',
  update: 'Edit existing records',
  delete: 'Remove records',
  execute: 'Perform status changes (approve, complete, cancel, assign)',
};

/**
 * Build an empty permissions object (all false)
 */
function emptyPermissions(): Permissions {
  return {
    items: { create: false, update: false, delete: false },
    imports: { create: false, update: false, delete: false, execute: false },
    transactions: {
      create: false,
      update: false,
      delete: false,
      execute: false,
    },
    transfers: { create: false, delete: false, execute: false },
    partners: { create: false, update: false, delete: false },
    storehouses: { create: false, update: false, delete: false },
    businessSettings: { update: false },
    users: { create: false, update: false, delete: false },
  };
}

/**
 * Deep clone permissions
 */
function clonePermissions(p: Permissions): Permissions {
  return JSON.parse(JSON.stringify(p));
}

export default function RoleManager() {
  const [roles, { refetch }] = createResource(() => getRoles());

  // ── Create / Edit state ──
  const [mode, setMode] = createSignal<'list' | 'create' | 'edit'>('list');
  const [editingRole, setEditingRole] = createSignal<CustomRole | null>(null);
  const [formName, setFormName] = createSignal('');
  const [formDesc, setFormDesc] = createSignal('');
  const [formPerms, setFormPerms] =
    createSignal<Permissions>(emptyPermissions());
  const [isSaving, setIsSaving] = createSignal(false);

  // ── Delete state ──
  const [deletingRole, setDeletingRole] = createSignal<CustomRole | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // ── Permission toggle ──
  function togglePerm(resource: PermissionResource, action: string) {
    const current = formPerms();
    const updated = clonePermissions(current);
    const res = updated[resource] as Record<string, boolean>;
    res[action] = !res[action];
    setFormPerms(updated);
  }

  function toggleAllForResource(resource: PermissionResource) {
    const current = formPerms();
    const updated = clonePermissions(current);
    const res = updated[resource] as Record<string, boolean>;
    const allOn = Object.values(res).every(Boolean);
    for (const key of Object.keys(res)) {
      res[key] = !allOn;
    }
    setFormPerms(updated);
  }

  // ── Create role ──
  function startCreate() {
    setFormName('');
    setFormDesc('');
    setFormPerms(emptyPermissions());
    setEditingRole(null);
    setMode('create');
  }

  // ── Edit role ──
  function startEdit(role: CustomRole) {
    setFormName(role.name);
    setFormDesc(role.description || '');
    setFormPerms(clonePermissions(role.permissions));
    setEditingRole(role);
    setMode('edit');
  }

  // ── Cancel ──
  function cancel() {
    setMode('list');
    setEditingRole(null);
  }

  // ── Save ──
  async function handleSave() {
    if (!formName().trim()) return;
    setIsSaving(true);
    try {
      if (mode() === 'create') {
        await createRole({
          name: formName().trim(),
          description: formDesc().trim(),
          permissions: formPerms(),
        });
        notificationStore.success('Role created');
      } else {
        const role = editingRole();
        if (!role) return;
        await updateRole(role._id, {
          name: formName().trim(),
          description: formDesc().trim(),
          permissions: formPerms(),
        });
        notificationStore.success('Role updated');
      }
      cancel();
      refetch();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  // ── Delete ──
  async function handleDelete() {
    const role = deletingRole();
    if (!role) return;
    setIsDeleting(true);
    try {
      await deleteRole(role._id);
      notificationStore.success(`"${role.name}" deleted`);
      setDeletingRole(null);
      refetch();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Count enabled permissions for a role ──
  function countPerms(perms: Permissions): number {
    let count = 0;
    for (const resource of Object.keys(perms) as PermissionResource[]) {
      const rp = perms[resource] as Record<string, boolean>;
      for (const val of Object.values(rp)) {
        if (val) count++;
      }
    }
    return count;
  }

  const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary';

  return (
    <>
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">
                Custom Roles
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                Define permission sets that can be assigned to users
              </p>
            </div>
            <Show when={mode() === 'list' && isAdmin()}>
              <Button variant="primary" onClick={startCreate}>
                + New Role
              </Button>
            </Show>
          </div>
        </CardHeader>
        <CardBody>
          {/* ─── Create / Edit Form ─── */}
          <Show when={mode() !== 'list'}>
            <div class="space-y-4">
              {/* Name & Description */}
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={formName()}
                    onInput={(e) => setFormName(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="e.g. Warehouse Staff"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formDesc()}
                    onInput={(e) => setFormDesc(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="What this role is for"
                  />
                </div>
              </div>

              {/* Permissions Grid */}
              <div>
                <h3 class="mb-2 text-sm font-semibold text-text-primary">
                  Permissions
                </h3>
                <p class="mb-3 text-xs text-text-muted">
                  Read access is granted to all users automatically. Toggle
                  write permissions below.
                </p>
                <div class="space-y-2">
                  <For
                    each={Object.keys(RESOURCE_LABELS) as PermissionResource[]}
                  >
                    {(resource) => {
                      const actions = RESOURCE_ACTIONS[resource];
                      const perms = () =>
                        formPerms()[resource] as Record<string, boolean>;
                      const allOn = () =>
                        actions.every((a) => perms()[a] === true);

                      return (
                        <div class="rounded-lg border border-border-default bg-bg-surface p-3">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleAllForResource(resource)}
                                class={`h-4 w-4 rounded border transition-colors ${
                                  allOn()
                                    ? 'border-accent-primary bg-accent-primary'
                                    : 'border-border-default bg-bg-surface'
                                }`}
                                title="Toggle all"
                              >
                                <Show when={allOn()}>
                                  <svg
                                    class="h-4 w-4 text-white"
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
                              </button>
                              <span class="text-sm font-medium text-text-primary">
                                {RESOURCE_LABELS[resource]}
                              </span>
                            </div>
                          </div>
                          <div class="mt-2 flex flex-wrap gap-2 pl-6">
                            <For each={actions}>
                              {(action) => {
                                const isOn = () => perms()[action] === true;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => togglePerm(resource, action)}
                                    class={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                      isOn()
                                        ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                                        : 'hover:border-border-hover border-border-default bg-bg-surface text-text-muted hover:text-text-secondary'
                                    }`}
                                    title={ACTION_DESCRIPTIONS[action]}
                                  >
                                    {ACTION_LABELS[action]}
                                  </button>
                                );
                              }}
                            </For>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>

              {/* Actions */}
              <div class="flex gap-2 border-t border-border-subtle pt-4">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={!formName().trim() || isSaving()}
                >
                  {isSaving()
                    ? 'Saving...'
                    : mode() === 'create'
                      ? 'Create Role'
                      : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </Show>

          {/* ─── Roles List ─── */}
          <Show when={mode() === 'list'}>
            <Show
              when={!roles.loading}
              fallback={
                <div class="space-y-2">
                  <For each={[1, 2]}>
                    {() => (
                      <div class="bg-bg-subtle h-16 animate-pulse rounded-lg border border-border-default" />
                    )}
                  </For>
                </div>
              }
            >
              <Show
                when={(roles() || []).length > 0}
                fallback={
                  <p class="py-8 text-center text-sm text-text-muted">
                    No custom roles yet. Create one to assign permissions to
                    users.
                  </p>
                }
              >
                <div class="space-y-2">
                  <For each={roles()}>
                    {(role) => (
                      <div class="flex items-center justify-between rounded-lg border border-border-default bg-bg-surface p-4 transition-colors hover:bg-bg-hover">
                        <div class="min-w-0 flex-1">
                          <h3 class="text-sm font-semibold text-text-primary">
                            {role.name}
                          </h3>
                          <div class="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-secondary">
                            <Show when={role.description}>
                              <span>{role.description}</span>
                            </Show>
                            <span class="text-text-muted">
                              {countPerms(role.permissions)} permission
                              {countPerms(role.permissions) !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div class="ml-3 flex gap-1.5">
                          <Show when={isAdmin()}>
                            <button
                              onClick={() => startEdit(role)}
                              class="hover:bg-bg-subtle rounded-md p-1.5 text-text-secondary hover:text-text-primary"
                              title="Edit"
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
                          <Show when={isAdmin()}>
                            <button
                              onClick={() => setDeletingRole(role)}
                              class="hover:bg-status-error/10 hover:text-status-error rounded-md p-1.5 text-text-secondary"
                              title="Delete"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </Show>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </CardBody>
      </Card>

      {/* Delete confirmation modal */}
      <Show when={deletingRole()}>
        {(role) => (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeletingRole(null);
            }}
          >
            <div class="w-full max-w-sm rounded-xl border border-border-default bg-bg-surface p-6 shadow-xl">
              <h3 class="text-lg font-semibold text-text-primary">
                Delete Role?
              </h3>
              <p class="mt-2 text-sm text-text-secondary">
                Are you sure you want to delete "{role().name}"? Users assigned
                this role will lose these permissions.
              </p>
              <div class="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeletingRole(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={isDeleting()}
                >
                  {isDeleting() ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </>
  );
}
