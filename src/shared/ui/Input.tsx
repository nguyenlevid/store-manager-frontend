import { TextField } from '@kobalte/core/text-field';
import { splitProps, type ComponentProps, Show, createSignal } from 'solid-js';

interface InputProps extends ComponentProps<typeof TextField.Input> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function Input(props: InputProps) {
  const [local, inputProps] = splitProps(props, [
    'label',
    'error',
    'helperText',
    'required',
    'class',
    'type',
  ]);

  const [showPassword, setShowPassword] = createSignal(false);
  const isPasswordField = () => local.type === 'password';
  const inputType = () => {
    if (isPasswordField()) {
      return showPassword() ? 'text' : 'password';
    }
    return local.type;
  };

  const hasError = () => Boolean(local.error);

  const inputClasses = () => {
    const base =
      'block w-full rounded-lg border px-3 py-2 text-sm bg-bg-surface text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-state-disabled disabled:text-state-disabled-text disabled:cursor-not-allowed';
    const errorClasses = hasError()
      ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger'
      : 'border-border-default focus:border-border-focus focus:ring-border-focus';
    const paddingRight = isPasswordField() ? 'pr-10' : '';
    return `${base} ${errorClasses} ${paddingRight} ${local.class || ''}`;
  };

  return (
    <TextField
      class="space-y-1"
      validationState={hasError() ? 'invalid' : 'valid'}
    >
      <Show when={local.label}>
        <TextField.Label class="block text-sm font-medium text-text-primary">
          {local.label}
          {local.required && <span class="ml-1 text-accent-danger">*</span>}
        </TextField.Label>
      </Show>
      <div class="relative">
        <TextField.Input
          class={inputClasses()}
          type={inputType()}
          {...inputProps}
        />
        <Show when={isPasswordField()}>
          <button
            type="button"
            class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted transition-colors hover:text-text-primary"
            onClick={() => setShowPassword(!showPassword())}
            tabIndex={-1}
          >
            <Show
              when={showPassword()}
              fallback={
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              }
            >
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
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            </Show>
          </button>
        </Show>
      </div>
      <Show when={hasError()}>
        <TextField.ErrorMessage class="text-sm text-accent-danger">
          {local.error}
        </TextField.ErrorMessage>
      </Show>
      <Show when={!hasError() && local.helperText}>
        <TextField.Description class="text-sm text-text-muted">
          {local.helperText}
        </TextField.Description>
      </Show>
    </TextField>
  );
}
