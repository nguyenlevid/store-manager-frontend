import type { JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { getUser, logoutUser } from '@/features/auth/store/session.store';
import { toggleTheme, getCurrentTheme, type ThemeName } from '@/theme';
import { FloatingActionButton } from '@/shared/ui';

interface MainLayoutProps {
  children: JSX.Element;
}

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

  // Add click listener when dropdown is open
  document.addEventListener('click', handleClickOutside);

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
                <A
                  href="/inventory"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Inventory
                </A>
                <A
                  href="/orders"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Orders
                </A>
                <A
                  href="/imports"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Imports
                </A>
                <A
                  href="/transfers"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Transfers
                </A>
                <A
                  href="/clients"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Clients
                </A>
                <A
                  href="/suppliers"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Suppliers
                </A>
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
                        href="/roles"
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
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          Roles & Access
                        </div>
                      </A>
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
                <A
                  href="/inventory"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Inventory
                </A>
                <A
                  href="/orders"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Orders
                </A>
                <A
                  href="/imports"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Imports
                </A>
                <A
                  href="/transfers"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Transfers
                </A>
                <A
                  href="/clients"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Clients
                </A>
                <A
                  href="/suppliers"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Suppliers
                </A>
              </div>
            </div>
          </Show>
        </nav>
      </header>

      {/* Main content */}
      <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {props.children}
      </main>

      {/* Global Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}
