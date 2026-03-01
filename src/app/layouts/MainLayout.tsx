import type { JSX } from 'solid-js';
import { A, useNavigate } from '@solidjs/router';
import { createSignal, createResource, onCleanup, Show, For } from 'solid-js';
import { getUser, logoutUser } from '@/features/auth/store/session.store';
import { toggleTheme, getCurrentTheme, type ThemeName } from '@/theme';
import { FloatingActionButton } from '@/shared/ui';
import { DowngradeBanner } from '@/features/billing/components/DowngradeBanner';
import { ComplianceGate } from '@/features/billing/components/ComplianceGate';
import {
  fetchPendingDowngrade,
  fetchSubscription,
  subscriptionStore,
  hasFeature,
} from '@/features/billing/store/subscription.store';
import type { FeatureFlag } from '@/features/billing/types/billing.types';
import { getStorehouses } from '@/shared/api/storehouses.api';
import { isAdmin } from '@/shared/stores/permissions.store';
import { isDev } from '@/features/auth/store/session.store';

interface MainLayoutProps {
  children: JSX.Element;
}

// ============================================
// Nav item definitions — features that require a paid plan
// get a lock icon + badge when the feature is unavailable.
// ============================================

interface NavItem {
  label: string;
  href: string;
  /** If set, the link is gated behind this feature flag. */
  feature?: FeatureFlag;
  /** Badge text shown when the feature is locked (e.g. "Pro"). */
  requiredPlanLabel?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inventory', href: '/inventory' },
  { label: 'Orders', href: '/orders' },
  { label: 'Imports', href: '/imports' },
  {
    label: 'Transfers',
    href: '/transfers',
    feature: 'transfers',
    requiredPlanLabel: 'Pro',
  },
  { label: 'Clients', href: '/clients' },
  { label: 'Suppliers', href: '/suppliers' },
  {
    label: 'Analytics',
    href: '/analytics',
    feature: 'advancedReports',
    requiredPlanLabel: 'Enterprise',
  },
];

export function MainLayout(props: MainLayoutProps) {
  const user = getUser();
  const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = createSignal(false);
  const [currentTheme, setCurrentTheme] =
    createSignal<ThemeName>(getCurrentTheme());

  const handleThemeToggle = () => {
    const newTheme = toggleTheme();
    setCurrentTheme(newTheme);
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/login';
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen());
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.user-dropdown')) {
      setIsDropdownOpen(false);
    }
  };

  // Add click listener and clean up on component disposal
  document.addEventListener('click', handleClickOutside);
  onCleanup(() => document.removeEventListener('click', handleClickOutside));

  const navigate = useNavigate();

  // Fetch subscription data eagerly so ComplianceGate can check limits on any route
  fetchSubscription();

  // Fetch pending downgrade data for banner
  fetchPendingDowngrade();

  // Fetch storehouses to count locked ones
  const [storehouses] = createResource(() => getStorehouses());
  const lockedStorehouseCount = () =>
    (storehouses() ?? []).filter((s) => s.isLocked).length;

  return (
    <div class="min-h-screen bg-bg-app">
      {/* Header */}
      <header class="sticky top-0 z-40 border-b border-border-subtle bg-bg-surface shadow-sm">
        <nav class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="flex h-16 items-center justify-between">
            {/* Logo and primary nav */}
            <div class="flex items-center gap-8">
              <A
                href="/"
                class="text-xl font-bold text-text-primary hover:text-text-link"
              >
                Store Manager
              </A>
              {/* Desktop Navigation */}
              <div class="hidden gap-1 md:flex">
                <For each={NAV_ITEMS}>
                  {(item) => {
                    const locked = () =>
                      item.feature ? !hasFeature(item.feature) : false;
                    return (
                      <A
                        href={locked() ? '/billing' : item.href}
                        class={`relative rounded-md px-3 py-2 text-sm font-medium ${
                          locked()
                            ? 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                        }`}
                        activeClass={
                          locked()
                            ? ''
                            : 'bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle'
                        }
                        title={
                          locked()
                            ? `Requires ${item.requiredPlanLabel} plan`
                            : undefined
                        }
                      >
                        <span class="flex items-center gap-1.5">
                          {item.label}
                          <Show when={locked()}>
                            {/* Lock icon */}
                            <svg
                              class="text-text-tertiary h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </Show>
                        </span>
                      </A>
                    );
                  }}
                </For>
              </div>
            </div>
            <div class="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen())}
                class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus md:hidden"
                aria-label="Toggle mobile menu"
              >
                <Show
                  when={isMobileMenuOpen()}
                  fallback={
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
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  }
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
                </Show>
              </button>

              {/* Theme toggle button */}
              <button
                onClick={handleThemeToggle}
                class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                title={
                  currentTheme() === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
                }
              >
                <Show
                  when={currentTheme() === 'dark'}
                  fallback={
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
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  }
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
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </Show>
              </button>

              {user && (
                <div class="user-dropdown relative">
                  <button
                    onClick={toggleDropdown}
                    class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-border-focus"
                  >
                    <div class="flex items-center gap-2">
                      <div class="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary font-semibold text-text-inverse">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span class="hidden sm:block">{user.name}</span>
                    </div>
                    <svg
                      class="h-4 w-4 transition-transform"
                      classList={{ 'rotate-180': isDropdownOpen() }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  <Show when={isDropdownOpen()}>
                    <div class="absolute right-0 z-50 mt-2 w-52 rounded-md border border-border-default bg-bg-surface py-1 shadow-lg">
                      <A
                        href="/profile"
                        class="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div class="flex items-center gap-2">
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Profile
                        </div>
                      </A>
                      <A
                        href="/settings"
                        class="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div class="flex items-center gap-2">
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
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          Business Settings
                        </div>
                      </A>
                      <A
                        href="/team"
                        class="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <div class="flex items-center gap-2">
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
                          Team Management
                        </div>
                      </A>
                      <Show when={isAdmin()}>
                        <A
                          href="/billing"
                          class="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <div class="flex items-center gap-2">
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
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
                            Billing
                          </div>
                        </A>
                      </Show>
                      <Show when={isDev()}>
                        <A
                          href="/dev"
                          class="block px-4 py-2 text-sm text-text-primary hover:bg-bg-hover"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <div class="flex items-center gap-2">
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
                                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                              />
                            </svg>
                            Dev Portal
                          </div>
                        </A>
                      </Show>
                      <div class="my-1 border-t border-border-subtle"></div>
                      <button
                        onClick={handleLogout}
                        class="block w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-hover"
                      >
                        <div class="flex items-center gap-2">
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
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Logout
                        </div>
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          <Show when={isMobileMenuOpen()}>
            <div class="border-t border-border-subtle bg-bg-surface py-3 md:hidden">
              <div class="flex flex-col gap-1">
                <For each={NAV_ITEMS}>
                  {(item) => {
                    const locked = () =>
                      item.feature ? !hasFeature(item.feature) : false;
                    return (
                      <A
                        href={locked() ? '/billing' : item.href}
                        class={`rounded-md px-3 py-2 text-sm font-medium ${
                          locked()
                            ? 'text-text-tertiary hover:bg-bg-hover hover:text-text-secondary'
                            : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                        }`}
                        activeClass={
                          locked()
                            ? ''
                            : 'bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle'
                        }
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={
                          locked()
                            ? `Requires ${item.requiredPlanLabel} plan`
                            : undefined
                        }
                      >
                        <span class="flex items-center gap-1.5">
                          {item.label}
                          <Show when={locked()}>
                            <svg
                              class="text-text-tertiary h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </Show>
                        </span>
                      </A>
                    );
                  }}
                </For>
              </div>
            </div>
          </Show>
        </nav>
      </header>

      {/* Downgrade banner */}
      <DowngradeBanner
        pendingDowngrade={subscriptionStore.pendingDowngrade()}
        lockedStorehouseCount={lockedStorehouseCount()}
        isAdmin={isAdmin()}
        onNavigateToBilling={() => navigate('/billing')}
      />

      {/* Main content */}
      <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ComplianceGate>{props.children}</ComplianceGate>
      </main>

      {/* Global Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}
