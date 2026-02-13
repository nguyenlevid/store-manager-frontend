import { createSignal, Show, type Component } from 'solid-js';

interface CopyableIdProps {
  id: string;
  prefix?: string;
  class?: string;
}

export const CopyableId: Component<CopyableIdProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const shortId = () => props.id.slice(-6);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(props.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <span class={`inline-flex items-center gap-1.5 ${props.class || ''}`}>
      <span>
        {props.prefix && `${props.prefix} `}#{shortId()}
      </span>
      <button
        type="button"
        onClick={copyToClipboard}
        class="inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-bg-hover"
        title={copied() ? 'Copied!' : 'Copy full ID'}
      >
        <Show
          when={copied()}
          fallback={
            <svg
              class="h-3.5 w-3.5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          }
        >
          <svg
            class="h-3.5 w-3.5 text-accent-success"
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
      </button>
    </span>
  );
};
