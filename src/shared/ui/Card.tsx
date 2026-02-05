import { type JSX, splitProps } from 'solid-js';

interface CardProps {
  children: JSX.Element;
  class?: string;
}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['class', 'children']);

  const baseStyles =
    'bg-bg-surface rounded-lg border border-border-default shadow-sm overflow-hidden';
  const computedClass = `${baseStyles} ${local.class || ''}`;

  return (
    <div class={computedClass} {...others}>
      {local.children}
    </div>
  );
}

interface CardHeaderProps {
  children: JSX.Element;
  class?: string;
}

export function CardHeader(props: CardHeaderProps) {
  const [local, others] = splitProps(props, ['class', 'children']);

  const baseStyles = 'px-6 py-4 border-b border-border-subtle';
  const computedClass = `${baseStyles} ${local.class || ''}`;

  return (
    <div class={computedClass} {...others}>
      {local.children}
    </div>
  );
}

interface CardBodyProps {
  children: JSX.Element;
  class?: string;
}

export function CardBody(props: CardBodyProps) {
  const [local, others] = splitProps(props, ['class', 'children']);

  const baseStyles = 'px-6 py-4';
  const computedClass = `${baseStyles} ${local.class || ''}`;

  return (
    <div class={computedClass} {...others}>
      {local.children}
    </div>
  );
}

interface CardFooterProps {
  children: JSX.Element;
  class?: string;
}

export function CardFooter(props: CardFooterProps) {
  const [local, others] = splitProps(props, ['class', 'children']);

  const baseStyles = 'px-6 py-4 border-t border-gray-200 bg-gray-50';
  const computedClass = `${baseStyles} ${local.class || ''}`;

  return (
    <div class={computedClass} {...others}>
      {local.children}
    </div>
  );
}
