import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  For,
  type Component,
} from 'solid-js';
import type { Item } from '@/features/inventory/types/inventory.types';

export interface ItemSelectProps {
  /** Full list of inventory items to choose from */
  items: Item[];
  /** Currently selected item ID */
  value: string;
  /** Called when selection changes */
  onChange: (itemId: string) => void;
  /** Optional placeholder */
  placeholder?: string;
  /** Show stock quantity badge */
  showStock?: boolean;
  /** Make field required */
  required?: boolean;
}

export const ItemSelect: Component<ItemSelectProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLUListElement | undefined;

  // Resolve the currently selected item
  const selectedItem = () =>
    props.items.find((i) => i.id === props.value) ?? null;

  // Filter items by search text (name or storehouse)
  const filtered = () => {
    const term = search().toLowerCase();
    if (!term) return props.items;
    return props.items.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.storeHouse?.name ?? '').toLowerCase().includes(term)
    );
  };

  // Click-outside handler
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      close();
    }
  };

  createEffect(() => {
    if (isOpen()) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    onCleanup(() =>
      document.removeEventListener('mousedown', handleClickOutside)
    );
  });

  const open = () => {
    setIsOpen(true);
    setSearch('');
    setHighlightedIndex(-1);
    // Focus input after opening
    requestAnimationFrame(() => inputRef?.focus());
  };

  const close = () => {
    setIsOpen(false);
    setSearch('');
    setHighlightedIndex(-1);
  };

  const select = (item: Item) => {
    props.onChange(item.id);
    close();
  };

  const clear = (e: MouseEvent) => {
    e.stopPropagation();
    props.onChange('');
    close();
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const list = filtered();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, list.length - 1));
        scrollToHighlighted();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
        scrollToHighlighted();
        break;
      case 'Enter': {
        e.preventDefault();
        const item = list[highlightedIndex()];
        if (highlightedIndex() >= 0 && item) {
          select(item);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  const scrollToHighlighted = () => {
    requestAnimationFrame(() => {
      const el = listRef?.querySelector('[data-highlighted="true"]');
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  return (
    <div ref={containerRef} class="relative">
      {/* Hidden native input for form required validation */}
      <Show when={props.required}>
        <input
          type="text"
          required
          value={props.value}
          class="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </Show>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => (isOpen() ? close() : open())}
        class="flex w-full items-center justify-between rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-bg-hover focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-primary"
      >
        <Show
          when={selectedItem()}
          fallback={
            <span class="text-text-muted">
              {props.placeholder ?? 'Select item...'}
            </span>
          }
        >
          {(item) => (
            <div class="min-w-0 flex-1">
              <span class="text-text-primary">{item().name}</span>
              <span class="ml-1.5 text-xs text-text-muted">
                {item().storeHouse?.name ?? ''}
              </span>
              <Show when={props.showStock}>
                <span class="ml-1.5 text-xs text-text-secondary">
                  ({item().quantity})
                </span>
              </Show>
            </div>
          )}
        </Show>

        <div class="flex items-center gap-1">
          <Show when={props.value}>
            <button
              type="button"
              onClick={clear}
              class="rounded p-0.5 text-text-muted hover:text-text-primary"
              aria-label="Clear selection"
            >
              <svg
                class="h-3.5 w-3.5"
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
          </Show>
          <svg
            class="h-4 w-4 text-text-muted transition-transform"
            classList={{ 'rotate-180': isOpen() }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div class="absolute z-50 mt-1 w-full rounded-lg border border-border-default bg-bg-surface shadow-lg">
          {/* Search input */}
          <div class="border-b border-border-default p-2">
            <input
              ref={inputRef}
              type="text"
              value={search()}
              onInput={(e) => {
                setSearch(e.currentTarget.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search items..."
              class="w-full rounded border border-border-default bg-bg-surface-subtle px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Options list */}
          <ul
            ref={listRef}
            class="max-h-56 overflow-y-auto py-1"
            role="listbox"
          >
            <Show
              when={filtered().length > 0}
              fallback={
                <li class="px-3 py-3 text-center text-sm text-text-muted">
                  No items found
                </li>
              }
            >
              <For each={filtered()}>
                {(item, idx) => (
                  <li
                    role="option"
                    aria-selected={item.id === props.value}
                    data-highlighted={idx() === highlightedIndex()}
                    onClick={() => select(item)}
                    class="cursor-pointer px-3 py-2 transition-colors hover:bg-bg-hover"
                    classList={{
                      'bg-bg-hover': idx() === highlightedIndex(),
                      'bg-accent-primary/5': item.id === props.value,
                    }}
                  >
                    <div class="flex items-center justify-between">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-text-primary">
                          {item.name}
                        </p>
                        <p class="truncate text-xs text-text-muted">
                          {item.storeHouse?.name ?? 'No storehouse'}
                        </p>
                      </div>
                      <Show when={props.showStock}>
                        <span class="ml-2 flex-shrink-0 rounded bg-bg-surface-subtle px-1.5 py-0.5 text-xs text-text-secondary">
                          {item.quantity} {item.unit}
                        </span>
                      </Show>
                      <Show when={item.id === props.value}>
                        <svg
                          class="ml-2 h-4 w-4 flex-shrink-0 text-accent-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </Show>
                    </div>
                  </li>
                )}
              </For>
            </Show>
          </ul>
        </div>
      </Show>
    </div>
  );
};
