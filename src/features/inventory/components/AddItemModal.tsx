import {
  createSignal,
  createResource,
  createEffect,
  Show,
  For,
  type Component,
} from 'solid-js';
import { Button } from '@/shared/ui/Button';
import {
  getInventoryItems,
  createItem,
  getItemUnits,
} from '../api/inventory.api';
import { notificationStore } from '@/shared/stores/notification.store';
import type { Item } from '../types/inventory.types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storehouses: Array<{ id: string; name: string }>;
}

interface ItemFormData {
  name: string;
  description: string;
  unitPrice: string;
  origin: string;
  tags: string;
  quantity: string;
  unit: string;
  storeHouse: string;
}

export const AddItemModal: Component<AddItemModalProps> = (props) => {
  const [formData, setFormData] = createSignal<ItemFormData>({
    name: '',
    description: '',
    unitPrice: '',
    origin: '',
    tags: '',
    quantity: '0',
    unit: 'pcs',
    storeHouse: '',
  });

  const [nameInput, setNameInput] = createSignal('');
  const [showSuggestions, setShowSuggestions] = createSignal(false);
  const [unitInput, setUnitInput] = createSignal('pcs');
  const [showUnitSuggestions, setShowUnitSuggestions] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Fetch existing items for autocomplete
  const [existingItems] = createResource(() => getInventoryItems());

  // Fetch existing units for autocomplete
  const [existingUnits, { refetch: refetchUnits }] = createResource(() =>
    getItemUnits()
  );

  // Refetch units when modal opens
  createEffect(() => {
    if (props.isOpen) {
      refetchUnits();
    }
  });

  // Filter items based on name input
  const suggestions = () => {
    const input = nameInput().toLowerCase().trim();
    if (!input || input.length < 2) return [];

    const items = existingItems();
    if (!items) return [];

    return items
      .filter((item) => item.name.toLowerCase().includes(input))
      .slice(0, 5); // Show max 5 suggestions
  };

  // Check for conflicts in real-time
  const nameConflict = () => {
    const name = nameInput().trim();
    if (!name || name.length < 2) return null;
    const conflicts = findSimilarItems(name);
    return conflicts.length > 0 ? conflicts : null;
  };

  // Filter units based on input
  const unitSuggestions = () => {
    const input = unitInput().toLowerCase().trim();
    if (!input) return existingUnits() || [];

    const units = existingUnits();
    if (!units) return [];

    return units.filter((unit) => unit.toLowerCase().includes(input));
  };

  const handleUnitInput = (value: string) => {
    setUnitInput(value);
    setFormData({ ...formData(), unit: value });
    setShowUnitSuggestions(true);
  };

  const handleUnitSuggestionClick = (unit: string) => {
    setUnitInput(unit);
    setFormData({ ...formData(), unit });
    setShowUnitSuggestions(false);
  };

  const handleNameInput = (value: string) => {
    setNameInput(value);
    setFormData({ ...formData(), name: value });
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (item: Item) => {
    setNameInput(item.name);
    setUnitInput(item.unit);
    setFormData({
      ...formData(),
      name: item.name,
      description: item.description || '',
      unitPrice: item.unitPrice.toString(),
      origin: item.origin || '',
      tags: item.tags.join(', '),
      unit: item.unit,
    });
    setShowSuggestions(false);
  };

  // Check for similar items
  const findSimilarItems = (name: string): Item[] => {
    const items = existingItems();
    if (!items) return [];

    const trimmedName = name.trim().toLowerCase();
    return items.filter((item) => {
      const itemName = item.name.toLowerCase();
      // Exact match or very similar
      return (
        itemName === trimmedName ||
        itemName.replace(/[\s-_]/g, '') === trimmedName.replace(/[\s-_]/g, '')
      );
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const data = formData();

      // Validate
      if (!data.name.trim()) {
        throw new Error('Item name is required');
      }
      if (!data.storeHouse) {
        throw new Error('Please select a storehouse');
      }
      if (!data.unitPrice || parseFloat(data.unitPrice) <= 0) {
        throw new Error('Unit price must be greater than 0');
      }

      // Find selected storehouse
      const selectedStorehouse = props.storehouses.find(
        (sh) => sh.id === data.storeHouse
      );
      if (!selectedStorehouse) {
        throw new Error('Invalid storehouse selected');
      }

      // Prepare payload
      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        unitPrice: parseFloat(data.unitPrice),
        origin: data.origin.trim() || undefined,
        tags: data.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        quantity: parseInt(data.quantity) || 0,
        unit: data.unit,
        storeHouse: {
          id: selectedStorehouse.id,
          name: selectedStorehouse.name,
        },
      };

      await createItem(payload);

      // Show success notification
      notificationStore.success('Item created successfully!', {
        title: 'Success',
        duration: 4000,
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        unitPrice: '',
        origin: '',
        tags: '',
        quantity: '0',
        unit: 'pcs',
        storeHouse: '',
      });
      setNameInput('');
      setUnitInput('pcs');

      props.onSuccess();
      props.onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create item';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting()) {
      setFormData({
        name: '',
        description: '',
        unitPrice: '',
        origin: '',
        tags: '',
        quantity: '0',
        unit: 'pcs',
        storeHouse: '',
      });
      setNameInput('');
      setUnitInput('pcs');
      setError(null);
      props.onClose();
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
          {/* Background overlay */}
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={handleClose}
          />

          {/* Modal panel */}
          <div
            class="relative inline-block transform overflow-hidden rounded-lg bg-bg-surface text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
            onClick={(e) => {
              // Close dropdown when clicking on modal but not on name input or dropdown
              const target = e.target as HTMLElement;
              if (!target.closest('.name-input-wrapper')) {
                setShowSuggestions(false);
              }
            }}
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div class="border-b border-border-default bg-bg-surface px-6 py-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-semibold text-text-primary">
                    Add New Item
                  </h3>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting()}
                    class="hover:bg-bg-subtle rounded-lg p-1 text-text-secondary hover:text-text-primary disabled:opacity-50"
                  >
                    <svg
                      class="h-6 w-6"
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
              </div>

              {/* Body */}
              <div class="bg-bg-surface px-6 py-4">
                <div class="space-y-4">
                  {/* Error message */}
                  <Show when={error()}>
                    <div class="rounded-lg bg-status-danger-bg p-3 text-sm text-status-danger-text">
                      {error()}
                    </div>
                  </Show>

                  {/* Item Name with Autocomplete */}
                  <div class="name-input-wrapper relative">
                    <label class="block text-sm font-medium text-text-primary">
                      Item Name <span class="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameInput()}
                      onInput={(e) => handleNameInput(e.currentTarget.value)}
                      onFocus={() =>
                        nameInput().length >= 2 && setShowSuggestions(true)
                      }
                      placeholder="Start typing item name..."
                      required
                      class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />

                    {/* Inline Conflict Warning */}
                    <Show when={!showSuggestions() && nameConflict()}>
                      <div class="mt-2 rounded-lg border border-accent-warning bg-accent-warning-subtle p-3">
                        <div class="flex items-start gap-2">
                          <svg
                            class="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-warning"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div class="flex-1">
                            <p class="text-sm font-medium text-accent-warning">
                              Similar item
                              {nameConflict()!.length > 1 ? 's' : ''} found
                            </p>
                            <div class="mt-2 space-y-1.5">
                              <For each={nameConflict()!}>
                                {(item) => (
                                  <div class="text-xs text-text-secondary">
                                    <span class="font-medium text-text-primary">
                                      {item.name}
                                    </span>
                                    {' • '}
                                    {item.storeHouse.name}
                                    {' • '}
                                    {item.quantity} {item.unit} in stock
                                  </div>
                                )}
                              </For>
                            </div>
                            <p class="text-text-tertiary mt-2 text-xs">
                              Consider using the existing item or choose a
                              different name to avoid confusion.
                            </p>
                          </div>
                        </div>
                      </div>
                    </Show>

                    {/* Autocomplete Suggestions */}
                    <Show when={showSuggestions() && suggestions().length > 0}>
                      <div class="autocomplete-dropdown absolute z-10 mt-1 w-full rounded-lg border border-border-default bg-bg-surface shadow-lg">
                        <div class="p-2 text-xs text-text-secondary">
                          Similar items found. Click to autofill:
                        </div>
                        <For each={suggestions()}>
                          {(item) => (
                            <button
                              type="button"
                              onClick={() => handleSuggestionClick(item)}
                              class="hover:bg-bg-subtle w-full border-t border-border-subtle px-4 py-3 text-left"
                            >
                              <div class="font-medium text-text-primary">
                                {item.name}
                              </div>
                              <Show when={item.description}>
                                <div class="mt-1 text-sm text-text-secondary">
                                  {item.description}
                                </div>
                              </Show>
                              <div class="text-text-tertiary mt-1 text-xs">
                                {item.storeHouse.name} • {item.quantity}{' '}
                                {item.unit}
                              </div>
                            </button>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  {/* Description */}
                  <div>
                    <label class="block text-sm font-medium text-text-primary">
                      Description
                    </label>
                    <textarea
                      value={formData().description}
                      onInput={(e) =>
                        setFormData({
                          ...formData(),
                          description: e.currentTarget.value,
                        })
                      }
                      onFocus={() => {
                        setShowSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      rows={3}
                      placeholder="Item description..."
                      class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                  </div>

                  {/* Two columns */}
                  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Unit Price */}
                    <div>
                      <label class="block text-sm font-medium text-text-primary">
                        Unit Price <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData().unitPrice}
                        onInput={(e) =>
                          setFormData({
                            ...formData(),
                            unitPrice: e.currentTarget.value,
                          })
                        }
                        onFocus={() => {
                          setShowSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        required
                        placeholder="0.00"
                        class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </div>

                    {/* Initial Quantity */}
                    <div>
                      <label class="block text-sm font-medium text-text-primary">
                        Initial Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData().quantity}
                        onInput={(e) =>
                          setFormData({
                            ...formData(),
                            quantity: e.currentTarget.value,
                          })
                        }
                        onFocus={() => {
                          setShowSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        placeholder="0"
                        class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />
                    </div>

                    {/* Unit */}
                    <div class="relative">
                      <label class="block text-sm font-medium text-text-primary">
                        Unit <span class="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={unitInput()}
                        onInput={(e) => handleUnitInput(e.currentTarget.value)}
                        onFocus={() => {
                          setShowSuggestions(false);
                          setShowUnitSuggestions(true);
                        }}
                        required
                        placeholder="e.g., pcs, box, kg..."
                        class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      />

                      {/* Unit Autocomplete Suggestions */}
                      <Show
                        when={
                          showUnitSuggestions() && unitSuggestions().length > 0
                        }
                      >
                        <div class="autocomplete-dropdown absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border-default bg-bg-surface shadow-lg">
                          <div class="p-2 text-xs text-text-secondary">
                            Existing units:
                          </div>
                          <For each={unitSuggestions()}>
                            {(unit) => (
                              <button
                                type="button"
                                onClick={() => handleUnitSuggestionClick(unit)}
                                class="hover:bg-bg-subtle w-full border-t border-border-subtle px-4 py-2 text-left text-sm"
                              >
                                <span class="text-text-primary">{unit}</span>
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>

                    {/* Storehouse */}
                    <div>
                      <label class="block text-sm font-medium text-text-primary">
                        Storehouse <span class="text-red-500">*</span>
                      </label>
                      <select
                        value={formData().storeHouse}
                        onChange={(e) =>
                          setFormData({
                            ...formData(),
                            storeHouse: e.currentTarget.value,
                          })
                        }
                        onFocus={() => {
                          setShowSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        required
                        class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                      >
                        <option value="">Select storehouse...</option>
                        <For each={props.storehouses}>
                          {(warehouse) => (
                            <option value={warehouse.id}>
                              {warehouse.name}
                            </option>
                          )}
                        </For>
                      </select>
                    </div>
                  </div>

                  {/* Origin */}
                  <div>
                    <label class="block text-sm font-medium text-text-primary">
                      Origin
                    </label>
                    <input
                      type="text"
                      value={formData().origin}
                      onInput={(e) =>
                        setFormData({
                          ...formData(),
                          origin: e.currentTarget.value,
                        })
                      }
                      onFocus={() => {
                        setShowSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      placeholder="e.g., China, Taiwan, USA"
                      class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label class="block text-sm font-medium text-text-primary">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={formData().tags}
                      onInput={(e) =>
                        setFormData({
                          ...formData(),
                          tags: e.currentTarget.value,
                        })
                      }
                      onFocus={() => {
                        setShowSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      placeholder="electronics, accessories, computers (comma-separated)"
                      class="placeholder-text-tertiary mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                    <p class="text-text-tertiary mt-1 text-xs">
                      Separate tags with commas
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div class="bg-bg-subtle border-t border-border-default px-6 py-4">
                <div class="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting()}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting()}
                  >
                    {isSubmitting() ? 'Creating...' : 'Create Item'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Show>
  );
};
