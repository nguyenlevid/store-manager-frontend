/**
 * Team Management Page
 *
 * Unified page for managing team members, custom roles, and access assignments.
 *
 * Three tabs:
 *   1. Members  — List, invite, deactivate/reactivate, search & filter
 *   2. Roles    — CRUD for custom roles (reuses RoleManager component)
 *   3. Access   — Assign roles & storehouses to team members
 */

import { createSignal, createResource, Show, For, createMemo } from 'solid-js';
import { Card, CardBody, CardHeader, Button, Input } from '@/shared/ui';
import RoleManager from '@/shared/components/RoleManager';
import { isAdmin } from '@/shared/stores/permissions.store';
import { getBusiness } from '@/shared/stores/business.store';
import { getUser } from '@/features/auth/store/session.store';
import { notificationStore } from '@/shared/stores/notification.store';
import { getBusinessUsers, type BusinessUser } from '@/shared/api/users.api';
import {
  getRoles,
  assignRolesToUser,
  assignStorehousesToUser,
  changeUserAppRole,
} from '@/shared/api/roles.api';
import { getStorehouses } from '@/shared/api/storehouses.api';
import {
  deactivateUser,
  reactivateUser,
  inviteUser,
  getInvitedUsers,
} from '@/features/team/api/team.api';
import type { InvitedUser } from '@/features/team/types/team.types';
import InviteUserModal from '@/features/team/pages/InviteUserModal';
import { getErrorMessage, getErrorTitle } from '@/shared/lib/error-messages';

type Tab = 'members' | 'roles' | 'access';

export default function TeamManagementPage() {
  const [activeTab, setActiveTab] = createSignal<Tab>('members');

  return (
    <div class="py-6">
      {/* Header */}
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-text-primary">Team Management</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Manage team members, define custom roles, and assign permissions
        </p>
      </div>

      {/* Tab bar */}
      <div class="mb-6 flex gap-1 rounded-lg border border-border-default bg-bg-surface p-1">
        <TabButton
          active={activeTab() === 'members'}
          onClick={() => setActiveTab('members')}
          icon={
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          }
          label="Members"
        />
        <TabButton
          active={activeTab() === 'roles'}
          onClick={() => setActiveTab('roles')}
          icon={
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          }
          label="Roles"
        />
        <TabButton
          active={activeTab() === 'access'}
          onClick={() => setActiveTab('access')}
          icon={
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          }
          label="Access"
        />
      </div>

      {/* Tab content */}
      <Show when={activeTab() === 'members'}>
        <MembersPanel />
      </Show>

      <Show when={activeTab() === 'roles'}>
        <RoleManager />
      </Show>

      <Show when={activeTab() === 'access'}>
        <AccessPanel />
      </Show>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Tab Button
// ─────────────────────────────────────────────────────────────

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      class="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      classList={{
        'bg-accent-primary text-text-inverse': props.active,
        'text-text-secondary hover:text-text-primary hover:bg-bg-hover':
          !props.active,
      }}
      onClick={props.onClick}
    >
      <div class="flex items-center justify-center gap-2">
        <svg
          class="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {props.icon}
        </svg>
        {props.label}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared: Confirmation Modal
// ─────────────────────────────────────────────────────────────

function ConfirmationModal(props: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <Card class="w-full max-w-sm">
        <CardBody>
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-text-primary">
                {props.title}
              </h3>
              <p class="mt-1 text-sm text-text-secondary">{props.message}</p>
            </div>
            <div class="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={props.onCancel}
                disabled={props.isLoading}
              >
                Cancel
              </Button>
              <Button
                variant={props.confirmVariant || 'primary'}
                fullWidth
                onClick={props.onConfirm}
                disabled={props.isLoading}
              >
                {props.isLoading ? 'Processing...' : props.confirmLabel}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Members Panel — Team member list, invite, deactivate/reactivate
// ─────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'active' | 'deactivated' | 'invited';

function MembersPanel() {
  const currentUser = getUser();
  const businessCreator = () => getBusiness()?.creator || '';
  const [users, { refetch }] = createResource(() => getBusinessUsers());
  const [invitedUsers, { refetch: refetchInvited }] = createResource(() =>
    isAdmin() ? getInvitedUsers() : Promise.resolve([])
  );
  const [roles] = createResource(() => getRoles());
  const [showInviteModal, setShowInviteModal] = createSignal(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = createSignal<string>('all');

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = createSignal<{
    type: 'deactivate' | 'reactivate';
    user: BusinessUser;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = createSignal(false);

  const isCurrentUserAdmin = () =>
    currentUser?.appRole === 'admin' || currentUser?.appRole === 'dev';

  // Unified member list item type
  type MemberListItem =
    | { kind: 'user'; data: BusinessUser }
    | { kind: 'invited'; data: InvitedUser };

  // Filtered and searched members
  const filteredMembers = createMemo((): MemberListItem[] => {
    const sf = statusFilter();

    // When filtering by "invited", show only pending users
    if (sf === 'invited') {
      let items: MemberListItem[] = (invitedUsers() || []).map((u) => ({
        kind: 'invited' as const,
        data: u,
      }));
      const q = searchQuery().toLowerCase().trim();
      if (q) {
        items = items.filter((item) =>
          item.data.email.toLowerCase().includes(q)
        );
      }
      return items;
    }

    // Build user list
    let userList = users() || [];
    if (sf === 'active') {
      userList = userList.filter((u) => u.isActive !== false);
    } else if (sf === 'deactivated') {
      userList = userList.filter((u) => u.isActive === false);
    }

    // Role filter (by custom role — only applies to real users)
    if (roleFilter() !== 'all') {
      userList = userList.filter((u) => u.accessRole.includes(roleFilter()));
    }

    let items: MemberListItem[] = userList.map((u) => ({
      kind: 'user' as const,
      data: u,
    }));

    // For "all" status, append invited users at the end
    if (sf === 'all' && isCurrentUserAdmin()) {
      const invited: MemberListItem[] = (invitedUsers() || []).map((u) => ({
        kind: 'invited' as const,
        data: u,
      }));
      items = [...items, ...invited];
    }

    // Search
    const q = searchQuery().toLowerCase().trim();
    if (q) {
      items = items.filter((item) => {
        if (item.kind === 'user') {
          return (
            item.data.name.toLowerCase().includes(q) ||
            item.data.email.toLowerCase().includes(q)
          );
        }
        return item.data.email.toLowerCase().includes(q);
      });
    }

    return items;
  });

  const handleConfirmAction = async () => {
    const action = confirmAction();
    if (!action) return;

    setIsActionLoading(true);
    try {
      if (action.type === 'deactivate') {
        await deactivateUser(action.user._id);
        notificationStore.success(`${action.user.name} has been deactivated.`, {
          title: 'User Deactivated',
        });
      } else {
        await reactivateUser(action.user._id);
        notificationStore.success(`${action.user.name} has been reactivated.`, {
          title: 'User Reactivated',
        });
      }
      refetch();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsActionLoading(false);
      setConfirmAction(null);
    }
  };

  function roleBadge(appRole: string) {
    if (appRole === 'admin') {
      return (
        <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Admin
        </span>
      );
    }
    return null;
  }

  const [resendingEmail, setResendingEmail] = createSignal<string | null>(null);

  const handleResendInvite = async (inv: InvitedUser) => {
    setResendingEmail(inv.email);
    try {
      await inviteUser({
        email: inv.email,
        appRole: inv.assignedAppRole,
        roleIds: inv.assignedRoles,
        storeHouseIds: inv.assignedStoreHouses,
      });
      notificationStore.success(`Invitation resent to ${inv.email}`, {
        title: 'Invitation Resent',
      });
      refetchInvited();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setResendingEmail(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-text-primary">
                Members
                <Show when={users()}>
                  <span class="ml-2 text-sm font-normal text-text-secondary">
                    ({filteredMembers().length}
                    {filteredMembers().length !==
                      (users() || []).length + (invitedUsers() || []).length &&
                      ` of ${(users() || []).length + (invitedUsers() || []).length}`}
                    )
                  </span>
                </Show>
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                Manage your team members and their account status
              </p>
            </div>
            <Show when={isCurrentUserAdmin()}>
              <Button
                variant="primary"
                onClick={() => setShowInviteModal(true)}
              >
                <div class="flex items-center gap-1.5">
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
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                  Invite Member
                </div>
              </Button>
            </Show>
          </div>
        </CardHeader>
        <CardBody>
          {/* Search & Filters */}
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div class="flex-1">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery()}
                onInput={(e) => setSearchQuery(e.currentTarget.value)}
              />
            </div>
            <div class="flex gap-2">
              <select
                value={statusFilter()}
                onChange={(e) =>
                  setStatusFilter(e.currentTarget.value as StatusFilter)
                }
                class="bg-bg-input rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="deactivated">Deactivated</option>
                <Show when={isCurrentUserAdmin()}>
                  <option value="invited">Invited</option>
                </Show>
              </select>
              <select
                value={roleFilter()}
                onChange={(e) => setRoleFilter(e.currentTarget.value)}
                class="bg-bg-input rounded-lg border border-border-default px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus"
              >
                <option value="all">All Roles</option>
                <For each={roles() || []}>
                  {(role) => <option value={role._id}>{role.name}</option>}
                </For>
              </select>
            </div>
          </div>

          {/* User list */}
          <Show
            when={!users.loading}
            fallback={
              <div class="space-y-3">
                <For each={[1, 2, 3]}>
                  {() => (
                    <div class="bg-bg-subtle h-16 animate-pulse rounded-lg border border-border-default" />
                  )}
                </For>
              </div>
            }
          >
            <Show
              when={filteredMembers().length > 0}
              fallback={
                <p class="py-8 text-center text-sm text-text-secondary">
                  {(users() || []).length === 0 &&
                  (invitedUsers() || []).length === 0
                    ? 'No team members found.'
                    : 'No members match your filters.'}
                </p>
              }
            >
              <div class="divide-y divide-border-subtle">
                <For each={filteredMembers()}>
                  {(item) => (
                    <Show
                      when={item.kind === 'user'}
                      fallback={
                        /* ── Invited (pending) user row ── */
                        (() => {
                          const inv = (
                            item as { kind: 'invited'; data: InvitedUser }
                          ).data;
                          return (
                            <div class="flex items-center justify-between py-3">
                              <div class="flex min-w-0 items-center gap-3">
                                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-400 font-semibold text-white">
                                  <svg
                                    class="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      stroke-width="2"
                                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                                <div class="min-w-0">
                                  <div class="flex flex-wrap items-center gap-1.5">
                                    <span class="truncate font-medium text-text-primary">
                                      {inv.email}
                                    </span>
                                    <span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                      Invited
                                    </span>
                                    <Show
                                      when={inv.assignedAppRole === 'admin'}
                                    >
                                      <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                        Admin
                                      </span>
                                    </Show>
                                  </div>
                                  <p class="truncate text-sm text-text-secondary">
                                    Expires{' '}
                                    {new Date(
                                      inv.expiresAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div class="ml-3 flex shrink-0 gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={resendingEmail() === inv.email}
                                  onClick={() => handleResendInvite(inv)}
                                >
                                  {resendingEmail() === inv.email
                                    ? 'Sending...'
                                    : 'Resend'}
                                </Button>
                              </div>
                            </div>
                          );
                        })()
                      }
                    >
                      {/* ── Regular user row ── */}
                      {(() => {
                        const member = (
                          item as { kind: 'user'; data: BusinessUser }
                        ).data;
                        return (
                          <div class="flex items-center justify-between py-3">
                            <div class="flex min-w-0 items-center gap-3">
                              <div
                                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-white"
                                classList={{
                                  'bg-accent-primary':
                                    member.isActive !== false,
                                  'bg-gray-400': member.isActive === false,
                                }}
                              >
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div class="min-w-0">
                                <div class="flex flex-wrap items-center gap-1.5">
                                  <span
                                    class="truncate font-medium"
                                    classList={{
                                      'text-text-primary':
                                        member.isActive !== false,
                                      'text-text-secondary line-through':
                                        member.isActive === false,
                                    }}
                                  >
                                    {member.name}
                                  </span>
                                  {roleBadge(member.appRole)}
                                  <Show when={member._id === businessCreator()}>
                                    <span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                      Owner
                                    </span>
                                  </Show>
                                  <Show when={member.isActive === false}>
                                    <span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                      deactivated
                                    </span>
                                  </Show>
                                  <Show when={member._id === currentUser?._id}>
                                    <span class="text-xs text-text-secondary">
                                      (you)
                                    </span>
                                  </Show>
                                </div>
                                <p class="truncate text-sm text-text-secondary">
                                  {member.email}
                                </p>
                              </div>
                            </div>

                            <Show
                              when={
                                isCurrentUserAdmin() &&
                                member._id !== currentUser?._id &&
                                member.appRole !== 'dev'
                              }
                            >
                              <div class="ml-3 flex shrink-0 gap-2">
                                <Show
                                  when={member.isActive !== false}
                                  fallback={
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() =>
                                        setConfirmAction({
                                          type: 'reactivate',
                                          user: member,
                                        })
                                      }
                                    >
                                      Reactivate
                                    </Button>
                                  }
                                >
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() =>
                                      setConfirmAction({
                                        type: 'deactivate',
                                        user: member,
                                      })
                                    }
                                  >
                                    Deactivate
                                  </Button>
                                </Show>
                              </div>
                            </Show>
                          </div>
                        );
                      })()}
                    </Show>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </CardBody>
      </Card>

      {/* Invite modal */}
      <Show when={showInviteModal()}>
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            refetch();
            refetchInvited();
          }}
        />
      </Show>

      {/* Deactivate / Reactivate confirmation modal */}
      <Show when={confirmAction()}>
        {(action) => (
          <ConfirmationModal
            title={
              action().type === 'deactivate'
                ? 'Deactivate Member'
                : 'Reactivate Member'
            }
            message={
              action().type === 'deactivate'
                ? `Are you sure you want to deactivate ${action().user.name}? They will be logged out immediately and won't be able to access the system until reactivated.`
                : `Reactivate ${action().user.name}? They will be able to log in again.`
            }
            confirmLabel={
              action().type === 'deactivate' ? 'Deactivate' : 'Reactivate'
            }
            confirmVariant={
              action().type === 'deactivate' ? 'danger' : 'primary'
            }
            isLoading={isActionLoading()}
            onConfirm={handleConfirmAction}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </Show>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Access Panel — Role & storehouse assignment
// ─────────────────────────────────────────────────────────────

function AccessPanel() {
  const [users, { refetch: refetchUsers }] = createResource(() =>
    getBusinessUsers()
  );
  const [roles] = createResource(() => getRoles());
  const [storehouses] = createResource(() => getStorehouses());

  // Search
  const [searchQuery, setSearchQuery] = createSignal('');

  // Editing state
  const [editingUserId, setEditingUserId] = createSignal<string | null>(null);
  const [selectedRoles, setSelectedRoles] = createSignal<string[]>([]);
  const [selectedStorehouses, setSelectedStorehouses] = createSignal<string[]>(
    []
  );
  const [isSaving, setIsSaving] = createSignal(false);

  // Filtered users (only active users shown, search applied)
  const filteredUsers = createMemo(() => {
    let list = (users() || []).filter((u) => u.isActive !== false);

    const q = searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    return list;
  });

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
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  // App role badge
  function roleBadge(appRole: string) {
    if (appRole === 'admin') {
      return (
        <span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          Admin
        </span>
      );
    }
    return null;
  }

  const canAssignRoles = () => isAdmin();
  const canAssignStorehouses = () => isAdmin();
  const canEdit = () => isAdmin();

  // OG (business creator) check
  const businessCreator = () => getBusiness()?.creator || '';
  const currentUserId = () => getUser()?._id || '';
  const isOG = () => currentUserId() === businessCreator();

  function canEditUser(user: BusinessUser): boolean {
    if (!canEdit()) return false;
    if (user.appRole !== 'user') return false;
    if (user._id === currentUserId()) return false;
    return true;
  }

  function canChangeAppRole(user: BusinessUser): boolean {
    if (!isAdmin()) return false;
    if (user._id === currentUserId()) return false;
    if (user.appRole === 'dev') return false;
    if (user._id === businessCreator()) return false;
    if (user.appRole === 'admin') {
      return isOG() || getUser()?.appRole === 'dev';
    }
    return true;
  }

  async function handleToggleAppRole(user: BusinessUser) {
    const newRole = user.appRole === 'admin' ? 'user' : 'admin';
    try {
      await changeUserAppRole(user._id, newRole);
      notificationStore.success(
        `${user.name} ${newRole === 'admin' ? 'promoted to admin' : 'demoted to user'}`
      );
      refetchUsers();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-text-primary">
              Access Control
            </h2>
            <p class="mt-1 text-sm text-text-secondary">
              Assign roles, storehouses, and promote/demote team members
            </p>
          </div>
          <div class="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </div>
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
            when={filteredUsers().length > 0}
            fallback={
              <p class="py-8 text-center text-sm text-text-secondary">
                {(users() || []).length === 0
                  ? 'No users found.'
                  : 'No members match your search.'}
              </p>
            }
          >
            <div class="space-y-3">
              <For each={filteredUsers()}>
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
                              <Show when={user._id === businessCreator()}>
                                <span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  Owner
                                </span>
                              </Show>
                            </div>

                            {/* Current assignments */}
                            <div class="mt-2 flex flex-wrap gap-x-6 gap-y-1 pl-10">
                              <Show
                                when={user.appRole === 'user'}
                                fallback={
                                  <span class="text-xs italic text-text-muted">
                                    Full access (admin privileges)
                                  </span>
                                }
                              >
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
                                      <span class="text-status-error italic">
                                        None assigned
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
                              </Show>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div class="ml-3 flex items-center gap-1.5">
                            <Show when={canChangeAppRole(user)}>
                              <button
                                onClick={() => handleToggleAppRole(user)}
                                class="hover:bg-bg-subtle rounded-md px-2 py-1 text-xs font-medium text-text-secondary hover:text-text-primary"
                                title={
                                  user.appRole === 'admin'
                                    ? 'Demote to user'
                                    : 'Promote to admin'
                                }
                              >
                                {user.appRole === 'admin'
                                  ? 'Demote'
                                  : 'Promote'}
                              </button>
                            </Show>
                            <Show when={canEditUser(user)}>
                              <button
                                onClick={() => startEdit(user)}
                                class="hover:bg-bg-subtle rounded-md p-1.5 text-text-secondary hover:text-text-primary"
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
