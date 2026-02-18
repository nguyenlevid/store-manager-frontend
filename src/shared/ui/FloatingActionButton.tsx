import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { useNavigate } from '@solidjs/router';

export function FloatingActionButton() {
  const navigate = useNavigate();
  const [fabOpen, setFabOpen] = createSignal(false);
  const [isScrolling, setIsScrolling] = createSignal(false);
  let scrollTimeout: number | null = null;

  // Scroll detection for FAB opacity
  onMount(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    onCleanup(() => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    });
  });

  const quickActions = [
    {
      label: 'Create Order',
      icon: (
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
      color: 'bg-green-500 hover:bg-green-600',
      action: () => navigate('/orders?action=create'),
    },
    {
      label: 'Add Item',
      icon: (
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => navigate('/inventory?action=create'),
    },
    {
      label: 'Add Client',
      icon: (
        <svg
          class="h-5 w-5"
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
      ),
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => navigate('/clients?action=create'),
    },
    {
      label: 'Add Supplier',
      icon: (
        <svg
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      ),
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => navigate('/suppliers?action=create'),
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div class="fixed bottom-6 right-6 z-50">
        {/* Backdrop when FAB is open */}
        <Show when={fabOpen()}>
          <div class="fixed inset-0 z-40" onClick={() => setFabOpen(false)} />
        </Show>

        {/* FAB Menu Items */}
        <div class="relative">
          <Show when={fabOpen()}>
            <div class="absolute bottom-16 right-0 z-50 mb-2 flex flex-col items-end gap-3">
              {quickActions.map((action, index) => (
                <button
                  onClick={() => {
                    setFabOpen(false);
                    action.action();
                  }}
                  class={`flex items-center gap-3 rounded-full ${action.color} py-2 pl-4 pr-3 text-white shadow-lg transition-all duration-200`}
                  style={{
                    animation: `fabFadeSlideIn 0.2s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <span class="whitespace-nowrap text-sm font-medium">
                    {action.label}
                  </span>
                  <div class="flex h-8 w-8 items-center justify-center">
                    {action.icon}
                  </div>
                </button>
              ))}
            </div>
          </Show>

          {/* Main FAB Button */}
          <button
            onClick={() => setFabOpen(!fabOpen())}
            class={`fab-button hover:bg-accent-primary/90 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-white shadow-lg transition-all duration-300 hover:shadow-xl ${
              fabOpen() ? 'rotate-45' : ''
            } ${isScrolling() && !fabOpen() ? 'opacity-50' : 'opacity-100'}`}
          >
            <svg
              class="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fabFadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes fabShake {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(-8deg) scale(1.1); }
          30% { transform: rotate(8deg) scale(1.1); }
          45% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
          75% { transform: rotate(-2deg); }
          90% { transform: rotate(2deg); }
        }
        .fab-button:hover:not(.rotate-45) {
          animation: fabShake 0.4s ease-in-out;
        }
      `}</style>
    </>
  );
}
