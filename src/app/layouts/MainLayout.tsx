import type { JSX } from 'solid-js';
import { A } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { getUser, logoutUser } from '@/features/auth/store/session.store';
import { toggleTheme, getCurrentTheme, type ThemeName } from '@/theme';

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
                  href="/clients"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                >
                  Clients
                </A>
              </div>
            </div>

            {/* Right side: Mobile menu button, Theme toggle, and User menu */}
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
                    <div class="absolute right-0 z-50 mt-2 w-48 rounded-md border border-border-default bg-bg-surface py-1 shadow-lg">
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
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          Settings
                        </div>
                      </A>
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
                  href="/clients"
                  class="rounded-md px-3 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  activeClass="bg-accent-primary-subtle text-accent-primary hover:bg-accent-primary-subtle"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Clients
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
    </div>
  );
}
