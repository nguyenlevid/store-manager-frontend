import {
  createSignal,
  createResource,
  Show,
  For,
  createEffect,
} from 'solid-js';
import { Card, CardBody, CardHeader, Button } from '@/shared/ui';
import {
  getBusiness,
  saveAndRefreshBusiness,
  isBusinessLoaded,
} from '@/shared/stores/business.store';
import { can } from '@/shared/stores/permissions.store';
import {
  getStorehouses,
  createStorehouse,
  updateStorehouse,
  deleteStorehouse,
} from '@/shared/api/storehouses.api';
import type { Storehouse } from '@/shared/types/storehouse.types';
import { notificationStore } from '@/shared/stores/notification.store';
import { getErrorMessage, getErrorTitle } from '@/shared/lib/error-messages';

/**
 * Common currencies with labels
 */
const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (\u20AC)' },
  { code: 'GBP', label: 'British Pound (\u00A3)' },
  { code: 'JPY', label: 'Japanese Yen (\u00A5)' },
  { code: 'CNY', label: 'Chinese Yuan (\u00A5)' },
  { code: 'KRW', label: 'South Korean Won (\u20A9)' },
  { code: 'VND', label: 'Vietnamese Dong (\u20AB)' },
  { code: 'THB', label: 'Thai Baht (\u0E3F)' },
  { code: 'INR', label: 'Indian Rupee (\u20B9)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'MYR', label: 'Malaysian Ringgit (RM)' },
  { code: 'PHP', label: 'Philippine Peso (\u20B1)' },
  { code: 'IDR', label: 'Indonesian Rupiah (Rp)' },
  { code: 'BRL', label: 'Brazilian Real (R$)' },
  { code: 'MXN', label: 'Mexican Peso (MX$)' },
  { code: 'RUB', label: 'Russian Ruble (\u20BD)' },
  { code: 'TRY', label: 'Turkish Lira (\u20BA)' },
];

/**
 * Common timezones
 */
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'America/Argentina/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Seoul',
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Jakarta',
  'Asia/Manila',
  'Asia/Kuala_Lumpur',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Lagos',
  'Africa/Johannesburg',
  'UTC',
];

export default function SettingsPage() {
  // ── Business data from shared store ──
  const business = getBusiness;

  // ── Business info form ──
  const [bizName, setBizName] = createSignal('');
  const [bizEmail, setBizEmail] = createSignal('');
  const [bizPhone, setBizPhone] = createSignal('');
  const [bizAddress, setBizAddress] = createSignal('');
  const [currency, setCurrency] = createSignal('');
  const [timezone, setTimezone] = createSignal('');
  const [isSavingBiz, setIsSavingBiz] = createSignal(false);
  const [bizInitialized, setBizInitialized] = createSignal(false);

  // Initialize form when business loads
  createEffect(() => {
    const biz = business();
    if (biz && !bizInitialized()) {
      setBizName(biz.name || '');
      setBizEmail(biz.email || '');
      setBizPhone(biz.phoneNumber || '');
      setBizAddress(biz.address || '');
      setCurrency(biz.currency || 'USD');
      setTimezone(biz.timezone || 'UTC');
      setBizInitialized(true);
    }
  });

  const hasBizChanges = () => {
    const biz = business();
    if (!biz) return false;
    return (
      bizName() !== (biz.name || '') ||
      bizEmail() !== (biz.email || '') ||
      bizPhone() !== (biz.phoneNumber || '') ||
      bizAddress() !== (biz.address || '') ||
      currency() !== (biz.currency || 'USD') ||
      timezone() !== (biz.timezone || 'UTC')
    );
  };

  const handleSaveBusiness = async () => {
    const biz = business();
    if (!biz) return;
    setIsSavingBiz(true);
    try {
      await saveAndRefreshBusiness(biz.id, {
        name: bizName(),
        email: bizEmail(),
        phoneNumber: bizPhone(),
        address: bizAddress(),
        currency: currency(),
        timezone: timezone(),
      });
      notificationStore.success('Business settings saved');
      // Re-initialize form from the now-updated store
      setBizInitialized(false);
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsSavingBiz(false);
    }
  };

  // ── Storehouses ──
  const [storehouses, { refetch: refetchStorehouses }] = createResource(() =>
    getStorehouses()
  );

  // Add storehouse form
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newShName, setNewShName] = createSignal('');
  const [newShAddress, setNewShAddress] = createSignal('');
  const [newShPhone, setNewShPhone] = createSignal('');
  const [newShEmail, setNewShEmail] = createSignal('');
  const [isAddingSh, setIsAddingSh] = createSignal(false);

  // Edit storehouse
  const [editingSh, setEditingSh] = createSignal<Storehouse | null>(null);
  const [editShName, setEditShName] = createSignal('');
  const [editShAddress, setEditShAddress] = createSignal('');
  const [editShPhone, setEditShPhone] = createSignal('');
  const [editShEmail, setEditShEmail] = createSignal('');
  const [isSavingSh, setIsSavingSh] = createSignal(false);

  // Delete confirm
  const [deletingSh, setDeletingSh] = createSignal<Storehouse | null>(null);
  const [isDeletingSh, setIsDeletingSh] = createSignal(false);

  const resetAddForm = () => {
    setNewShName('');
    setNewShAddress('');
    setNewShPhone('');
    setNewShEmail('');
    setShowAddForm(false);
  };

  const handleAddStorehouse = async () => {
    if (!newShName().trim() || !newShAddress().trim()) return;
    setIsAddingSh(true);
    try {
      await createStorehouse({
        name: newShName().trim(),
        address: newShAddress().trim(),
        ...(newShPhone().trim() && { phoneNumber: newShPhone().trim() }),
        ...(newShEmail().trim() && { email: newShEmail().trim() }),
      });
      notificationStore.success('Storehouse created');
      resetAddForm();
      refetchStorehouses();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsAddingSh(false);
    }
  };

  const startEditingSh = (sh: Storehouse) => {
    setEditingSh(sh);
    setEditShName(sh.name);
    setEditShAddress(sh.address || '');
    setEditShPhone(sh.phoneNumber || '');
    setEditShEmail(sh.email || '');
  };

  const handleUpdateStorehouse = async () => {
    const sh = editingSh();
    if (!sh || !editShName().trim()) return;
    setIsSavingSh(true);
    try {
      await updateStorehouse(sh.id, {
        name: editShName().trim(),
        ...(editShAddress().trim() && { address: editShAddress().trim() }),
        ...(editShPhone().trim() && { phoneNumber: editShPhone().trim() }),
        ...(editShEmail().trim() && { email: editShEmail().trim() }),
      });
      notificationStore.success('Storehouse updated');
      setEditingSh(null);
      refetchStorehouses();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsSavingSh(false);
    }
  };

  const handleDeleteStorehouse = async () => {
    const sh = deletingSh();
    if (!sh) return;
    setIsDeletingSh(true);
    try {
      await deleteStorehouse(sh.id);
      notificationStore.success(`"${sh.name}" deleted`);
      setDeletingSh(null);
      refetchStorehouses();
    } catch (err: any) {
      notificationStore.error(getErrorMessage(err), {
        title: getErrorTitle(err) || 'Error',
      });
    } finally {
      setIsDeletingSh(false);
    }
  };

  const selectClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary';
  const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary';

  return (
    <div class="space-y-6 py-8">
      <div>
        <h1 class="text-3xl font-bold text-text-primary">Business Settings</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Manage your business information, regional preferences, and
          storehouses
        </p>
      </div>

      <Show
        when={isBusinessLoaded()}
        fallback={
          <div class="space-y-4">
            <div class="h-48 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
            <div class="h-48 animate-pulse rounded-lg border border-border-default bg-bg-surface" />
          </div>
        }
      >
        <Show
          when={business()}
          fallback={
            <Card>
              <CardBody>
                <p class="text-sm text-text-secondary">
                  No business found. Please contact your administrator.
                </p>
              </CardBody>
            </Card>
          }
        >
          {/* ─── Business Information ─── */}
          <Card>
            <CardHeader>
              <h2 class="text-lg font-semibold text-text-primary">
                Business Information
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                General details about your business
              </p>
            </CardHeader>
            <CardBody>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={bizName()}
                    onInput={(e) => setBizName(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="Your Business Name"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Email
                  </label>
                  <input
                    type="email"
                    value={bizEmail()}
                    onInput={(e) => setBizEmail(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="business@example.com"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={bizPhone()}
                    onInput={(e) => setBizPhone(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Address
                  </label>
                  <input
                    type="text"
                    value={bizAddress()}
                    onInput={(e) => setBizAddress(e.currentTarget.value)}
                    class={inputClass}
                    placeholder="123 Main St, City"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* ─── Regional Settings ─── */}
          <Card>
            <CardHeader>
              <h2 class="text-lg font-semibold text-text-primary">
                Regional Settings
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                Currency and timezone for your business
              </p>
            </CardHeader>
            <CardBody>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Currency
                  </label>
                  <select
                    value={currency()}
                    onChange={(e) => setCurrency(e.currentTarget.value)}
                    class={selectClass}
                  >
                    <For each={CURRENCIES}>
                      {(c) => (
                        <option value={c.code}>
                          {c.code} — {c.label}
                        </option>
                      )}
                    </For>
                  </select>
                  <p class="mt-1 text-xs text-text-muted">
                    All prices will display in this currency.
                  </p>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-text-primary">
                    Timezone
                  </label>
                  <select
                    value={timezone()}
                    onChange={(e) => setTimezone(e.currentTarget.value)}
                    class={selectClass}
                  >
                    <For each={TIMEZONES}>
                      {(tz) => (
                        <option value={tz}>{tz.replace(/_/g, ' ')}</option>
                      )}
                    </For>
                  </select>
                  <p class="mt-1 text-xs text-text-muted">
                    All timestamps will display in this timezone.
                  </p>
                </div>
              </div>

              {/* Save button for business info + regional */}
              <Show when={can('businessSettings', 'update')}>
                <div class="mt-6 flex items-center gap-3 border-t border-border-subtle pt-4">
                  <Button
                    variant="primary"
                    onClick={handleSaveBusiness}
                    disabled={!hasBizChanges() || isSavingBiz()}
                  >
                    {isSavingBiz() ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Show when={hasBizChanges()}>
                    <span class="text-status-warning text-xs">
                      Unsaved changes
                    </span>
                  </Show>
                </div>
              </Show>
            </CardBody>
          </Card>

          {/* ─── Storehouses ─── */}
          <Card>
            <CardHeader>
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-lg font-semibold text-text-primary">
                    Storehouses
                  </h2>
                  <p class="mt-1 text-sm text-text-secondary">
                    Manage your warehouse locations
                  </p>
                </div>
                <Show when={!showAddForm() && can('storehouses', 'create')}>
                  <Button
                    variant="primary"
                    onClick={() => setShowAddForm(true)}
                  >
                    + Add Storehouse
                  </Button>
                </Show>
              </div>
            </CardHeader>
            <CardBody>
              {/* Add storehouse form */}
              <Show when={showAddForm()}>
                <div class="border-accent-primary/30 bg-accent-primary/5 mb-4 rounded-lg border p-4">
                  <h3 class="mb-3 text-sm font-semibold text-text-primary">
                    New Storehouse
                  </h3>
                  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label class="mb-1 block text-xs font-medium text-text-secondary">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={newShName()}
                        onInput={(e) => setNewShName(e.currentTarget.value)}
                        class={inputClass}
                        placeholder="Main Warehouse"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-text-secondary">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={newShAddress()}
                        onInput={(e) => setNewShAddress(e.currentTarget.value)}
                        class={inputClass}
                        placeholder="123 Storage Rd"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-text-secondary">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={newShPhone()}
                        onInput={(e) => setNewShPhone(e.currentTarget.value)}
                        class={inputClass}
                        placeholder="+1 234 567 890"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs font-medium text-text-secondary">
                        Email
                      </label>
                      <input
                        type="email"
                        value={newShEmail()}
                        onInput={(e) => setNewShEmail(e.currentTarget.value)}
                        class={inputClass}
                        placeholder="warehouse@example.com"
                      />
                    </div>
                  </div>
                  <div class="mt-3 flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleAddStorehouse}
                      disabled={
                        !newShName().trim() ||
                        !newShAddress().trim() ||
                        isAddingSh()
                      }
                    >
                      {isAddingSh() ? 'Creating...' : 'Create'}
                    </Button>
                    <Button variant="outline" onClick={resetAddForm}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </Show>

              {/* Storehouses list */}
              <Show
                when={!storehouses.loading}
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
                  when={(storehouses() || []).length > 0}
                  fallback={
                    <p class="py-8 text-center text-sm text-text-muted">
                      No storehouses yet. Add one to get started.
                    </p>
                  }
                >
                  <div class="space-y-2">
                    <For each={storehouses()}>
                      {(sh) => (
                        <Show
                          when={editingSh()?.id !== sh.id}
                          fallback={
                            /* Edit inline form */
                            <div class="border-accent-primary/30 bg-accent-primary/5 rounded-lg border p-4">
                              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                                    Name *
                                  </label>
                                  <input
                                    type="text"
                                    value={editShName()}
                                    onInput={(e) =>
                                      setEditShName(e.currentTarget.value)
                                    }
                                    class={inputClass}
                                  />
                                </div>
                                <div>
                                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                                    Address
                                  </label>
                                  <input
                                    type="text"
                                    value={editShAddress()}
                                    onInput={(e) =>
                                      setEditShAddress(e.currentTarget.value)
                                    }
                                    class={inputClass}
                                  />
                                </div>
                                <div>
                                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                                    Phone
                                  </label>
                                  <input
                                    type="text"
                                    value={editShPhone()}
                                    onInput={(e) =>
                                      setEditShPhone(e.currentTarget.value)
                                    }
                                    class={inputClass}
                                  />
                                </div>
                                <div>
                                  <label class="mb-1 block text-xs font-medium text-text-secondary">
                                    Email
                                  </label>
                                  <input
                                    type="email"
                                    value={editShEmail()}
                                    onInput={(e) =>
                                      setEditShEmail(e.currentTarget.value)
                                    }
                                    class={inputClass}
                                  />
                                </div>
                              </div>
                              <div class="mt-3 flex gap-2">
                                <Button
                                  variant="primary"
                                  onClick={handleUpdateStorehouse}
                                  disabled={
                                    !editShName().trim() || isSavingSh()
                                  }
                                >
                                  {isSavingSh() ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setEditingSh(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          }
                        >
                          {/* Display row */}
                          <div
                            class={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                              sh.isLocked
                                ? 'border-border-warning/50 bg-bg-warning/5 opacity-75'
                                : 'border-border-default bg-bg-surface hover:bg-bg-hover'
                            }`}
                          >
                            <div class="min-w-0 flex-1">
                              <div class="flex items-center gap-2">
                                <h3 class="text-sm font-semibold text-text-primary">
                                  {sh.name}
                                </h3>
                                <Show when={sh.isLocked}>
                                  <span class="bg-bg-warning/20 text-text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                                    <svg
                                      class="h-3 w-3"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                      stroke-width="2"
                                    >
                                      <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                      />
                                    </svg>
                                    Locked
                                  </span>
                                </Show>
                              </div>
                              <div class="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-secondary">
                                <Show when={sh.address}>
                                  <span>{sh.address}</span>
                                </Show>
                                <Show when={sh.phoneNumber}>
                                  <span>{sh.phoneNumber}</span>
                                </Show>
                                <Show when={sh.email}>
                                  <span>{sh.email}</span>
                                </Show>
                              </div>
                            </div>
                            <div class="ml-3 flex gap-1.5">
                              <Show
                                when={
                                  can('storehouses', 'update') && !sh.isLocked
                                }
                              >
                                <button
                                  onClick={() => startEditingSh(sh)}
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
                              <Show
                                when={
                                  can('storehouses', 'delete') && !sh.isLocked
                                }
                              >
                                <button
                                  onClick={() => setDeletingSh(sh)}
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
                        </Show>
                      )}
                    </For>
                  </div>
                </Show>
              </Show>
            </CardBody>
          </Card>
        </Show>
      </Show>

      {/* Delete confirmation modal */}
      <Show when={deletingSh()}>
        {(sh) => (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setDeletingSh(null);
            }}
          >
            <div class="w-full max-w-sm rounded-xl border border-border-default bg-bg-surface p-6 shadow-xl">
              <h3 class="text-lg font-semibold text-text-primary">
                Delete Storehouse?
              </h3>
              <p class="mt-2 text-sm text-text-secondary">
                Are you sure you want to delete "{sh().name}"? Items assigned to
                this storehouse may be affected.
              </p>
              <div class="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeletingSh(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteStorehouse}
                  disabled={isDeletingSh()}
                >
                  {isDeletingSh() ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
