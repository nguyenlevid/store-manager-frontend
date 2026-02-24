/**
 * BarcodeLabel – renders a single printable label for an item.
 *
 * Displays business name (+ logo placeholder), QR/barcode,
 * item name, unit, storehouse, and truncated ID.
 */
import { createSignal, createEffect, Show, type Component } from 'solid-js';
import {
  generateQRDataURL,
  generateBarcodeDataURL,
  truncateId,
  type CodeType,
} from '@/shared/lib/barcode-utils';

export interface BarcodeLabelProps {
  /** MongoDB _id of the item */
  itemId: string;
  /** Human-readable item name */
  itemName: string;
  /** Unit (e.g. "kg", "pcs") */
  unit: string;
  /** Storehouse / location name */
  storehouse?: string;
  /** Which code to render */
  codeType: CodeType;
  /** Label size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const BarcodeLabel: Component<BarcodeLabelProps> = (props) => {
  const [dataURL, setDataURL] = createSignal<string>('');

  createEffect(async () => {
    const id = props.itemId;
    if (!id) return;

    if (props.codeType === 'qr') {
      const qrSize =
        props.size === 'sm' ? 120 : props.size === 'lg' ? 240 : 160;
      const url = await generateQRDataURL(id, { size: qrSize, margin: 1 });
      setDataURL(url);
    } else {
      const barHeight =
        props.size === 'sm' ? 40 : props.size === 'lg' ? 80 : 60;
      const url = generateBarcodeDataURL(id, {
        height: barHeight,
        displayValue: true,
        fontSize: props.size === 'sm' ? 10 : 14,
        margin: 4,
      });
      setDataURL(url);
    }
  });

  const sizeClasses = () => {
    switch (props.size) {
      case 'sm':
        return 'p-2 gap-0.5';
      case 'lg':
        return 'p-4 gap-2';
      default:
        return 'p-3 gap-1';
    }
  };

  const textClasses = () => {
    switch (props.size) {
      case 'sm':
        return { name: 'text-xs', meta: 'text-[8px]', id: 'text-[8px]' };
      case 'lg':
        return { name: 'text-base', meta: 'text-xs', id: 'text-xs' };
      default:
        return { name: 'text-sm', meta: 'text-[9px]', id: 'text-[9px]' };
    }
  };

  return (
    <div
      class={`flex flex-col items-center border border-gray-300 bg-white ${sizeClasses()}`}
      style={{ 'page-break-inside': 'avoid' }}
    >
      {/* Item name */}
      <p
        class={`max-w-full truncate text-center font-bold text-black ${textClasses().name}`}
        title={props.itemName}
      >
        {props.itemName}
      </p>

      {/* Code image */}
      <Show when={dataURL()}>
        <img
          src={dataURL()}
          alt={`${props.codeType === 'qr' ? 'QR Code' : 'Barcode'} for ${props.itemName}`}
          class={
            props.codeType === 'qr' ? 'aspect-square' : 'w-full max-w-[220px]'
          }
          style={{ 'image-rendering': 'pixelated' }}
        />
      </Show>

      {/* Meta row: unit + storehouse */}
      <div
        class={`flex items-center gap-2 text-text-secondary ${textClasses().meta}`}
      >
        <span class="font-medium">Unit: {props.unit}</span>
        <Show when={props.storehouse}>
          <span class="text-text-muted">·</span>
          <span class="truncate" title={props.storehouse}>
            {props.storehouse}
          </span>
        </Show>
      </div>

      {/* ID (tiny, for reference – truncated) */}
      <p
        class={`max-w-full truncate font-mono text-gray-400 ${textClasses().id}`}
        title={props.itemId}
      >
        {truncateId(props.itemId)}
      </p>
    </div>
  );
};
