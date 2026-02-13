import {
  createSignal,
  createEffect,
  Show,
  For,
  type Component,
  createResource,
} from 'solid-js';
import { Button } from '@/shared/ui/Button';
import {
  getInventoryItems,
  updateItem,
  getItemUnits,
} from '../api/inventory.api';
import { getStorehouses } from '@/shared/api/storehouses.api';
import type { Item } from '../types/inventory.types';
import { notificationStore } from '@/shared/stores/notification.store';
import type { Storehouse } from '@/shared/types/storehouse.types';

interface ViewItemDetailsModalProps {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ViewItemDetailsModal: Component<ViewItemDetailsModalProps> = (
  props
) => {
  // Edit mode toggle
  const [isEditMode, setIsEditMode] = createSignal(false);

  // Form fields
  const [name, setName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [unitPrice, setUnitPrice] = createSignal('');
  const [origin, setOrigin] = createSignal('');
  const [quantity, setQuantity] = createSignal('');
  const [unit, setUnit] = createSignal('');
  const [tags, setTags] = createSignal<string[]>([]);
  const [tagInput, setTagInput] = createSignal('');
  const [storeHouse, setStoreHouse] = createSignal('');
  const [reorderLevel, setReorderLevel] = createSignal('');

  // Loading and error states
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Autocomplete states for name field
  const [nameInput, setNameInput] = createSignal('');
  const [showNameSuggestions, setShowNameSuggestions] = createSignal(false);
  const [nameSuggestions, setNameSuggestions] = createSignal<Item[]>([]);

  // Autocomplete states for unit field
  const [unitInput, setUnitInput] = createSignal('');
  const [showUnitSuggestions, setShowUnitSuggestions] = createSignal(false);

  // Resources
  const [allItems] = createResource(() => getInventoryItems());
  const [storehouses] = createResource(() => getStorehouses());
  const [existingUnits, { refetch: refetchUnits }] = createResource(() =>
    getItemUnits()
  );

  // Refetch units when modal opens
  createEffect(() => {
    if (props.isOpen) {
      refetchUnits();
    }
  });

  // Initialize form with item data when modal opens or item changes
  createEffect(() => {
    if (props.isOpen && props.item) {
      const item = props.item;
      setName(item.name);
      setNameInput(item.name);
      setDescription(item.description || '');
      setUnitPrice(item.unitPrice.toString());
      setOrigin(item.origin || '');
      setQuantity(item.quantity.toString());
      setUnit(item.unit);
      setUnitInput(item.unit);
      setTags(item.tags || []);
      setStoreHouse(item.storeHouse.id);
      setReorderLevel(item.reorderLevel?.toString() || '');
      setIsEditMode(false);
      setError(null);
    }
  });

  // Name autocomplete logic
  createEffect(() => {
    if (!isEditMode()) return;

    const input = nameInput().trim().toLowerCase();
    if (input.length < 2) {
      setShowNameSuggestions(false);
      setNameSuggestions([]);
      return;
    }

    const items = allItems();
    if (!items) return;

    const filtered = items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(input) && item.id !== props.item.id
      )
      .slice(0, 5);

    setNameSuggestions(filtered);
    setShowNameSuggestions(filtered.length > 0);
  });

  // Unit autocomplete filtering
  const filteredUnits = () => {
    const input = unitInput().toLowerCase();
    const units = existingUnits();
    if (!units || !input) return units || [];
    return units.filter((u) => u.toLowerCase().includes(input));
  };

  // Handlers
  const handleNameInput = (value: string) => {
    setNameInput(value);
    setName(value);
    setShowUnitSuggestions(false); // Close unit dropdown
  };

  const handleNameSuggestionClick = (suggestedName: string) => {
    setNameInput(suggestedName);
    setName(suggestedName);
    setShowNameSuggestions(false);
  };

  const handleUnitInput = (value: string) => {
    setUnitInput(value);
    setUnit(value);
    setShowUnitSuggestions(value.trim().length > 0);
    setShowNameSuggestions(false); // Close name dropdown
  };

  const handleUnitSuggestionClick = (suggestedUnit: string) => {
    setUnitInput(suggestedUnit);
    setUnit(suggestedUnit);
    setShowUnitSuggestions(false);
  };

  const handleAddTag = () => {
    const tag = tagInput().trim();
    if (tag && !tags().includes(tag)) {
      setTags([...tags(), tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags().filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Check for conflicting items (similar names)
  const conflictingItems = () => {
    if (!isEditMode()) return [];

    const currentName = name().trim().toLowerCase();
    const items = allItems();

    if (!items || currentName.length < 2) return [];

    return items.filter(
      (item) =>
        item.id !== props.item.id &&
        item.name.toLowerCase().replace(/\s+/g, '') ===
          currentName.replace(/\s+/g, '')
    );
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name().trim()) {
      setError('Item name is required');
      return;
    }

    const parsedUnitPrice = parseFloat(unitPrice());
    if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
      setError('Valid unit price is required');
      return;
    }

    const parsedQuantity = parseInt(quantity());
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      setError('Valid quantity is required');
      return;
    }

    if (!unit().trim()) {
      setError('Unit is required');
      return;
    }

    if (!storeHouse()) {
      setError('Please select a storehouse');
      return;
    }

    setIsLoading(true);

    try {
      const selectedStoreHouse = storehouses()?.find(
        (sh: Storehouse) => sh.id === storeHouse()
      );

      if (!selectedStoreHouse) {
        throw new Error('Selected storehouse not found');
      }

      const updates = {
        name: name().trim(),
        description: description().trim() || undefined,
        unitPrice: parsedUnitPrice,
        origin: origin().trim() || undefined,
        quantity: parsedQuantity,
        unit: unit().trim(),
        tags: tags(),
        storeHouse: {
          id: selectedStoreHouse.id,
          name: selectedStoreHouse.name,
        },
        reorderLevel: reorderLevel() ? parseInt(reorderLevel()) : undefined,
        imageUrl: props.item.imageUrl, // Keep existing images
      };

      await updateItem(props.item.id, updates);

      notificationStore.success(`${name()} has been updated successfully`, {
        title: 'Item updated',
        duration: 4000,
      });

      props.onSuccess();
    } catch (err) {
      console.error('Failed to update item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode()) {
      // Reset to original values
      const item = props.item;
      setName(item.name);
      setNameInput(item.name);
      setDescription(item.description || '');
      setUnitPrice(item.unitPrice.toString());
      setOrigin(item.origin || '');
      setQuantity(item.quantity.toString());
      setUnit(item.unit);
      setUnitInput(item.unit);
      setTags(item.tags || []);
      setStoreHouse(item.storeHouse.id);
      setReorderLevel(item.reorderLevel?.toString() || '');
      setIsEditMode(false);
      setError(null);
    } else {
      props.onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay sm:items-center"
        onClick={() => handleCancel()}
      >
        <div
          class="w-full max-w-2xl rounded-t-xl bg-bg-surface shadow-xl sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-text-primary">
                {isEditMode() ? 'Edit Item' : 'Item Details'}
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                {isEditMode()
                  ? 'Update item information'
                  : 'View item information'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => props.onClose()}
              class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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

          {/* Content */}
          <form
            onSubmit={handleSubmit}
            class="max-h-[70vh] overflow-y-auto px-6 py-4"
          >
            <div class="space-y-4">
              {/* Error Message */}
              <Show when={error()}>
                <div class="rounded-lg bg-status-danger-bg p-3 text-sm text-status-danger-text">
                  {error()}
                </div>
              </Show>

              {/* Read-only mode display */}
              <Show when={!isEditMode()}>
                <div class="space-y-4">
                  {/* Name */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Name
                    </label>
                    <p class="mt-1 text-base text-text-primary">
                      {props.item.name}
                    </p>
                  </div>

                  {/* Description */}
                  <Show when={props.item.description}>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Description
                      </label>
                      <p class="mt-1 text-base text-text-primary">
                        {props.item.description}
                      </p>
                    </div>
                  </Show>

                  {/* Unit Price */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Unit Price
                    </label>
                    <p class="mt-1 text-base font-medium text-text-primary">
                      {formatCurrency(props.item.unitPrice)}
                    </p>
                  </div>

                  {/* Stock Info */}
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Quantity
                      </label>
                      <p class="mt-1 text-base text-text-primary">
                        {props.item.quantity} {props.item.unit}
                      </p>
                    </div>
                    <Show when={props.item.reorderLevel}>
                      <div>
                        <label class="block text-sm font-medium text-text-secondary">
                          Reorder Level
                        </label>
                        <p class="mt-1 text-base text-text-primary">
                          {props.item.reorderLevel}
                        </p>
                      </div>
                    </Show>
                  </div>

                  {/* Origin */}
                  <Show when={props.item.origin}>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Origin
                      </label>
                      <p class="mt-1 text-base text-text-primary">
                        {props.item.origin}
                      </p>
                    </div>
                  </Show>

                  {/* Storehouse */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Location
                    </label>
                    <p class="mt-1 text-base text-text-primary">
                      {props.item.storeHouse.name}
                    </p>
                  </div>

                  {/* Tags */}
                  <Show when={props.item.tags.length > 0}>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Tags
                      </label>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <For each={props.item.tags}>
                          {(tag) => (
                            <span class="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface-subtle px-3 py-1 text-sm font-medium text-text-primary">
                              {tag}
                            </span>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                </div>
              </Show>

              {/* Edit mode form */}
              <Show when={isEditMode()}>
                <div class="space-y-4">
                  {/* Name with autocomplete */}
                  <div class="relative">
                    <label class="block text-sm font-medium text-text-secondary">
                      Name <span class="text-status-danger-text">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameInput()}
                      onInput={(e) => handleNameInput(e.currentTarget.value)}
                      onFocus={() => {
                        setShowUnitSuggestions(false);
                        if (
                          nameInput().trim().length >= 2 &&
                          nameSuggestions().length > 0
                        ) {
                          setShowNameSuggestions(true);
                        }
                      }}
                      class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      placeholder="Enter item name"
                      required
                    />

                    {/* Name suggestions dropdown */}
                    <Show
                      when={
                        showNameSuggestions() && nameSuggestions().length > 0
                      }
                    >
                      <div class="absolute z-10 mt-1 w-full rounded-lg border border-border-default bg-bg-surface shadow-lg">
                        <div class="max-h-48 overflow-y-auto p-2">
                          <For each={nameSuggestions()}>
                            {(item) => (
                              <button
                                type="button"
                                onClick={() =>
                                  handleNameSuggestionClick(item.name)
                                }
                                class="w-full rounded px-3 py-2 text-left text-sm text-text-primary hover:bg-bg-hover"
                              >
                                {item.name}
                                <span class="ml-2 text-xs text-text-muted">
                                  ({item.quantity} {item.unit})
                                </span>
                              </button>
                            )}
                          </For>
                        </div>
                      </div>
                    </Show>

                    {/* Conflict warning */}
                    <Show when={conflictingItems().length > 0}>
                      <div class="border-status-warning-border mt-2 rounded border bg-status-warning-bg p-2 text-xs text-status-warning-text">
                        <p class="font-medium">⚠️ Similar item exists:</p>
                        <ul class="ml-4 mt-1 list-disc">
                          <For each={conflictingItems()}>
                            {(item) => (
                              <li>
                                {item.name} ({item.quantity} {item.unit})
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    </Show>
                  </div>

                  {/* Description */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Description
                    </label>
                    <textarea
                      value={description()}
                      onInput={(e) => setDescription(e.currentTarget.value)}
                      onFocus={() => {
                        setShowNameSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      rows={3}
                      class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      placeholder="Enter item description (optional)"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Unit Price <span class="text-status-danger-text">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitPrice()}
                      onInput={(e) => setUnitPrice(e.currentTarget.value)}
                      onFocus={() => {
                        setShowNameSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  {/* Quantity and Unit */}
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Quantity <span class="text-status-danger-text">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={quantity()}
                        onInput={(e) => setQuantity(e.currentTarget.value)}
                        onFocus={() => {
                          setShowNameSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div class="relative">
                      <label class="block text-sm font-medium text-text-secondary">
                        Unit <span class="text-status-danger-text">*</span>
                      </label>
                      <input
                        type="text"
                        value={unitInput()}
                        onInput={(e) => handleUnitInput(e.currentTarget.value)}
                        onFocus={() => {
                          setShowNameSuggestions(false);
                          if (unitInput().trim().length > 0) {
                            setShowUnitSuggestions(true);
                          }
                        }}
                        class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                        placeholder="e.g., pcs, kg, box"
                        required
                      />

                      {/* Unit suggestions dropdown */}
                      <Show
                        when={
                          showUnitSuggestions() && filteredUnits().length > 0
                        }
                      >
                        <div class="absolute z-10 mt-1 w-full rounded-lg border border-border-default bg-bg-surface shadow-lg">
                          <div class="max-h-32 overflow-y-auto p-2">
                            <For each={filteredUnits()}>
                              {(unitOption) => (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUnitSuggestionClick(unitOption)
                                  }
                                  class="w-full rounded px-3 py-1.5 text-left text-sm text-text-primary hover:bg-bg-hover"
                                >
                                  {unitOption}
                                </button>
                              )}
                            </For>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Origin and Reorder Level */}
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Origin
                      </label>
                      <input
                        type="text"
                        value={origin()}
                        onInput={(e) => setOrigin(e.currentTarget.value)}
                        onFocus={() => {
                          setShowNameSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                        placeholder="e.g., Vietnam, China"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-text-secondary">
                        Reorder Level
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={reorderLevel()}
                        onInput={(e) => setReorderLevel(e.currentTarget.value)}
                        onFocus={() => {
                          setShowNameSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                        placeholder="Low stock alert threshold"
                      />
                    </div>
                  </div>

                  {/* Storehouse */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Storehouse <span class="text-status-danger-text">*</span>
                    </label>
                    <select
                      value={storeHouse()}
                      onChange={(e) => setStoreHouse(e.currentTarget.value)}
                      onFocus={() => {
                        setShowNameSuggestions(false);
                        setShowUnitSuggestions(false);
                      }}
                      class="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                      required
                    >
                      <option value="">Select a storehouse</option>
                      <Show when={storehouses()}>
                        <For each={storehouses()}>
                          {(sh: Storehouse) => (
                            <option value={sh.id}>{sh.name}</option>
                          )}
                        </For>
                      </Show>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label class="block text-sm font-medium text-text-secondary">
                      Tags/Categories
                    </label>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <For each={tags()}>
                        {(tag) => (
                          <span class="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-surface-subtle px-3 py-1 text-sm font-medium text-text-primary">
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              class="ml-1 text-text-muted hover:text-text-primary"
                            >
                              <svg
                                class="h-3 w-3"
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
                          </span>
                        )}
                      </For>
                    </div>
                    <div class="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={tagInput()}
                        onInput={(e) => setTagInput(e.currentTarget.value)}
                        onKeyDown={handleTagKeyDown}
                        onFocus={() => {
                          setShowNameSuggestions(false);
                          setShowUnitSuggestions(false);
                        }}
                        class="flex-1 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                        placeholder="Add a tag..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTag}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </Show>
            </div>
          </form>

          {/* Footer */}
          <div class="flex justify-end gap-3 border-t border-border-default px-6 py-4">
            <Show
              when={isEditMode()}
              fallback={
                <>
                  <Button variant="outline" onClick={() => props.onClose()}>
                    Close
                  </Button>
                  <Button variant="primary" onClick={() => setIsEditMode(true)}>
                    Edit Item
                  </Button>
                </>
              }
            >
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading()}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isLoading()}
              >
                {isLoading() ? 'Saving...' : 'Save Changes'}
              </Button>
            </Show>
          </div>
        </div>
      </div>
    </Show>
  );
};
