import { Button as KobalteButton } from '@kobalte/core/button';
import { splitProps, type JSX, type ComponentProps } from 'solid-js';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ComponentProps<typeof KobalteButton> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: JSX.Element;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-primary text-text-inverse hover:bg-accent-primary-hover focus:ring-border-focus',
  secondary:
    'bg-accent-secondary text-text-inverse hover:bg-accent-secondary-hover focus:ring-border-focus',
  danger:
    'bg-accent-danger text-text-inverse hover:bg-accent-danger-hover focus:ring-border-focus',
  ghost:
    'bg-transparent text-text-primary hover:bg-bg-hover focus:ring-border-focus',
  outline:
    'bg-transparent border border-border-default text-text-primary hover:bg-bg-hover focus:ring-border-focus',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, [
    'variant',
    'size',
    'fullWidth',
    'class',
    'children',
  ]);

  const variant = local.variant || 'primary';
  const size = local.size || 'md';

  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-state-disabled disabled:text-state-disabled-text disabled:cursor-not-allowed';
  const widthStyles = local.fullWidth ? 'w-full' : '';
  const computedClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${local.class || ''}`;

  return (
    <KobalteButton class={computedClass} {...others}>
      {local.children}
    </KobalteButton>
  );
}
