/**
 * PrintLabelsModal – configures and prints barcode / QR labels.
 *
 * Features:
 *  - Pick code type: QR or Barcode (Code128)
 *  - Pick label size preset (40×30, 50×25, 60×40, 70×50, thermal)
 *  - Set quantity (copies) per item
 *  - Search / filter items when list is large
 *  - Business name + logo on each label
 *  - Storehouse name on each label
 *  - Live preview
 *  - Print via browser window.print()
 *  - Download as PDF via jspdf
 *  - Remembers last-used settings in localStorage
 */
import {
  createSignal,
  Show,
  For,
  type Component,
  createEffect,
  createMemo,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { Button } from '@/shared/ui/Button';
import { BarcodeLabel } from './BarcodeLabel';
import type {
  CodeType,
  LabelItem,
  LabelSizePreset,
} from '@/shared/lib/barcode-utils';
import {
  generateQRDataURL,
  generateBarcodeDataURL,
  truncateId,
  LABEL_SIZE_PRESETS,
  loadLabelSettings,
  saveLabelSettings,
} from '@/shared/lib/barcode-utils';
import { jsPDF } from 'jspdf';

/**
 * Rasterise an SVG data-URL to a PNG data-URL via an offscreen canvas.
 * jsPDF cannot embed SVGs directly, so barcodes must be converted first.
 */
function svgDataUrlToPngDataUrl(
  svgDataUrl: string,
  width = 400,
  height = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG into Image'));
    img.src = svgDataUrl;
  });
}

interface PrintLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Items to print labels for */
  items: LabelItem[];
  /** Business / company name – shown as a sheet header, not on each label */
  businessName?: string;
}

const MAX_TOTAL_LABELS = 1000;
const MAX_PER_ITEM = 9999;

export const PrintLabelsModal: Component<PrintLabelsModalProps> = (props) => {
  // Load persisted settings
  const saved = loadLabelSettings();

  const [codeType, setCodeType] = createSignal<CodeType>(saved.codeType);
  const [sizePresetId, setSizePresetId] = createSignal(saved.sizePresetId);
  const [itemCopies, setItemCopies] = createStore<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = createSignal('');
  const [isGeneratingPdf, setIsGeneratingPdf] = createSignal(false);

  // Derived preset
  const activePreset = createMemo(() => {
    const found = LABEL_SIZE_PRESETS.find((p) => p.id === sizePresetId());
    return found ?? LABEL_SIZE_PRESETS[0]!;
  }) as () => LabelSizePreset;

  const isThermal = createMemo(() => activePreset().height === 0);

  // Persist settings on change
  createEffect(() => {
    saveLabelSettings({
      codeType: codeType(),
      labelFormat: isThermal() ? 'thermal' : 'a4',
      sizePresetId: sizePresetId(),
    });
  });

  // Initialise copies from props
  createEffect(() => {
    if (props.isOpen && props.items.length > 0) {
      const copies: Record<string, number> = {};
      for (const item of props.items) {
        copies[item.id] = item.copies || 1;
      }
      setItemCopies(copies);
      setSearchTerm('');
    }
  });

  // Filtered items for the copy-count list
  const filteredItems = createMemo(() => {
    const term = searchTerm().toLowerCase().trim();
    if (!term) return props.items;
    return props.items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term) ||
        (item.storehouse ?? '').toLowerCase().includes(term)
    );
  });

  const totalLabels = () =>
    props.items.reduce((sum, item) => sum + (itemCopies[item.id] || 1), 0);

  const updateCopies = (id: string, value: number) => {
    // Calculate total without this item
    const otherItemsTotal = props.items
      .filter((item) => item.id !== id)
      .reduce((sum, item) => sum + (itemCopies[item.id] || 1), 0);

    // Maximum this item can have without exceeding total limit
    const maxForThisItem = Math.min(
      MAX_PER_ITEM,
      MAX_TOTAL_LABELS - otherItemsTotal
    );

    setItemCopies(id, Math.max(1, Math.min(maxForThisItem, value)));
  };

  const bizName = () => props.businessName || '';

  // ── Build expanded items + code images ─────────────
  const buildExpanded = () => {
    const expanded: LabelItem[] = [];
    for (const item of props.items) {
      const copies = itemCopies[item.id] || 1;
      for (let i = 0; i < copies; i++) expanded.push(item);
    }
    return expanded;
  };

  /**
   * Generate code images for all labels.
   * @param forPdf When true, barcode SVGs are rasterised to PNG so jsPDF can embed them.
   */
  const generateCodeImages = async (
    expanded: LabelItem[],
    preset: LabelSizePreset,
    forPdf = false
  ) => {
    const isQR = codeType() === 'qr';
    const isSmall = preset.width <= 50;
    const images: string[] = [];
    for (const item of expanded) {
      if (isQR) {
        images.push(
          await generateQRDataURL(item.id, {
            size: isSmall ? 140 : 200,
            margin: 1,
          })
        );
      } else {
        const svg = generateBarcodeDataURL(item.id, {
          height: isSmall ? 50 : 70,
          fontSize: 12,
          margin: 4,
        });
        if (forPdf) {
          // jsPDF doesn't support SVG — rasterise to PNG
          images.push(
            await svgDataUrlToPngDataUrl(
              svg,
              isSmall ? 300 : 400,
              isSmall ? 120 : 160
            )
          );
        } else {
          images.push(svg);
        }
      }
    }
    return images;
  };

  // ── Single label HTML builder ───────────────────────
  const buildLabelHTML = (
    item: LabelItem,
    codeImg: string,
    preset: LabelSizePreset
  ) => {
    const isQR = codeType() === 'qr';
    const isSmall = preset.width <= 50;
    const h = preset.height > 0 ? preset.height : 40;

    // Font sizes scale with label height
    const namePx = isSmall ? 7 : Math.min(10, h * 0.22);
    const metaPx = isSmall ? 6 : Math.min(8, h * 0.16);
    const idPx = isSmall ? 5 : Math.min(7, h * 0.14);

    // Budget (mm): padding 2 + name ~3 + gap 0.5 + meta ~2.5 + gap 0.5 + id ~2 + gap 0.5 = ~11
    // Smaller labels get tighter text so less overhead
    const overhead = isSmall ? 9 : 11;
    const qrDim = Math.max(8, Math.min(h - overhead, preset.width - 4));
    const codeStyle = isQR
      ? `width: ${qrDim}mm; height: ${qrDim}mm;`
      : `width: 90%; max-height: ${Math.max(6, h - overhead)}mm;`;

    return `<div style="
        width: ${preset.width}mm;
        ${preset.height > 0 ? `height: ${h}mm;` : ''}
        border: 0.5px solid #ccc;
        padding: 1mm;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 0.3mm; page-break-inside: avoid; background: #fff; overflow: hidden;
      ">
        <div style="font-weight: 700; font-size: ${namePx}px; text-align: center; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;">
          ${item.name}
        </div>
        <img src="${codeImg}" style="max-width: 100%; ${codeStyle} image-rendering: pixelated; flex-shrink: 0;" />
        <div style="font-size: ${metaPx}px; color: #555; display: flex; gap: 1.5mm; line-height: 1.2;">
          <span>Unit: ${item.unit}</span>
          ${item.storehouse ? `<span style="color: #999;">·</span><span>${item.storehouse}</span>` : ''}
        </div>
        <div style="font-family: monospace; font-size: ${idPx}px; color: #999; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;" title="${item.id}">
          ${truncateId(item.id)}
        </div>
      </div>`;
  };

  // ── Print handler ──────────────────────────────────
  const handlePrint = async () => {
    const preset = activePreset();
    const expanded = buildExpanded();
    const codeImages = await generateCodeImages(expanded, preset);

    const cols = preset.columns ?? 4;
    const gridStyle =
      cols === 1
        ? 'display: flex; flex-direction: column; align-items: center; gap: 6mm; padding: 4mm;'
        : `display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 3mm; padding: 8mm;`;

    const labelsHTML = expanded
      .map((item, i) => buildLabelHTML(item, codeImages[i]!, preset))
      .join('\n');

    const pageSize = cols === 1 ? '80mm auto' : 'A4';

    // Sheet header with business name (printed once, not per label)
    const sheetHeader = bizName()
      ? `<div style="text-align: center; padding: 2mm 0 4mm; font-size: 12px; font-weight: 600; color: #555; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid #ddd; margin-bottom: 4mm;">${bizName()}</div>`
      : '';

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Item Labels</title>
  <style>
    @page { size: ${pageSize}; margin: ${cols === 1 ? '2mm' : '5mm'}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .sheet-header { }
    .label-grid { ${gridStyle} }
    @media print { .sheet-header { position: running(header); } }
  </style>
</head>
<body>
  ${sheetHeader}
  <div class="label-grid">
    ${labelsHTML}
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // ── PDF download handler ───────────────────────────
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const preset = activePreset();
      const expanded = buildExpanded();
      const codeImages = await generateCodeImages(expanded, preset, true);

      const cols = preset.columns ?? 4;
      const isTh = cols === 1;

      // Page dimensions in mm
      const pageH = isTh ? 297 : 297;
      const marginX = isTh ? 5 : 10;
      const marginY = isTh ? 5 : 10;
      const gapX = 3;
      const gapY = 3;
      const lw = preset.width;
      const lh = preset.height > 0 ? preset.height : 40; // fallback height for thermal

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isTh ? [80, pageH] : 'a4',
      });

      // Sheet header with business name (once at top of first page)
      let x = marginX;
      let y = marginY;
      if (bizName()) {
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(bizName().toUpperCase(), isTh ? 40 : 105, y, {
          align: 'center',
        });
        y += 6;
      }
      let col = 0;

      for (let idx = 0; idx < expanded.length; idx++) {
        const item = expanded[idx]!;
        const img = codeImages[idx]!;

        // Check if we need a new page
        if (y + lh > pageH - marginY) {
          doc.addPage();
          x = marginX;
          y = marginY;
          col = 0;
        }

        // Label border
        doc.setDrawColor(200);
        doc.rect(x, y, lw, lh);

        let curY = y + 1.5;

        // Item name
        doc.setFontSize(lh <= 30 ? 5 : 6);
        doc.setTextColor(0);
        const truncName =
          item.name.length > 25 ? item.name.slice(0, 23) + '…' : item.name;
        doc.text(truncName, x + lw / 2, curY, { align: 'center' });
        curY += lh <= 30 ? 2 : 2.5;

        // Code image — QR sized to fill available height, leaving room for text
        const isQR = codeType() === 'qr';
        const overhead = lh <= 30 ? 7 : 9; // mm for name + meta + id + padding
        const availH = lh - overhead;
        const imgW = isQR ? Math.min(lw - 4, availH) : lw - 6;
        const imgH = isQR ? imgW : Math.min(availH, 12);
        doc.addImage(img, 'PNG', x + (lw - imgW) / 2, curY, imgW, imgH);
        curY += imgH + 1.5;

        // Unit + storehouse
        doc.setFontSize(lh <= 30 ? 3.5 : 4.5);
        doc.setTextColor(80);
        const meta = item.storehouse
          ? `Unit: ${item.unit} · ${item.storehouse}`
          : `Unit: ${item.unit}`;
        doc.text(meta, x + lw / 2, curY, { align: 'center' });
        curY += lh <= 30 ? 1.2 : 1.5;

        // ID
        doc.setFontSize(lh <= 30 ? 3 : 3.5);
        doc.setTextColor(150);
        doc.text(truncateId(item.id), x + lw / 2, curY, { align: 'center' });

        // Move to next position
        col++;
        if (col >= cols) {
          col = 0;
          x = marginX;
          y += lh + gapY;
        } else {
          x += lw + gapX;
        }
      }

      doc.save('item-labels.pdf');
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fixed inset-0 z-50 flex items-end justify-center bg-bg-overlay sm:items-center"
        onClick={() => props.onClose()}
      >
        <div
          class="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-xl bg-bg-surface shadow-xl sm:rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between border-b border-border-default px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-text-primary">
                Print Labels
              </h2>
              <p class="mt-1 text-sm text-text-secondary">
                {props.items.length} item{props.items.length !== 1 ? 's' : ''} ·{' '}
                {totalLabels()} / {MAX_TOTAL_LABELS} label
                {totalLabels() !== 1 ? 's' : ''}
              </p>
              <Show when={totalLabels() >= MAX_TOTAL_LABELS}>
                <p class="text-status-warning mt-1 text-xs">
                  ⚠ Maximum label limit reached
                </p>
              </Show>
            </div>
            <button
              type="button"
              onClick={() => props.onClose()}
              class="rounded-lg p-2 text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body – scrollable */}
          <div class="flex-1 overflow-y-auto px-6 py-4">
            {/* Options row */}
            <div class="mb-6 grid grid-cols-2 gap-4">
              {/* Code type */}
              <div>
                <label class="mb-2 block text-sm font-medium text-text-primary">
                  Code Type
                </label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeType('qr')}
                    class={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      codeType() === 'qr'
                        ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                        : 'border-border-default bg-bg-surface text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <svg
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm2 0h2v2h-2v-2zm-2 4h-2v2h2v-2zm2 0h2v2h-2v-2zm-2 4h-2v2h2v-2zm2 0h2v2h-2v-2z" />
                    </svg>
                    QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeType('barcode')}
                    class={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      codeType() === 'barcode'
                        ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                        : 'border-border-default bg-bg-surface text-text-secondary hover:bg-bg-hover'
                    }`}
                  >
                    <svg
                      class="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2 4h2v16H2V4zm4 0h1v16H6V4zm3 0h2v16H9V4zm4 0h1v16h-1V4zm3 0h2v16h-2V4zm4 0h2v16h-2V4z" />
                    </svg>
                    Barcode
                  </button>
                </div>
              </div>

              {/* Label size preset */}
              <div>
                <label class="mb-2 block text-sm font-medium text-text-primary">
                  Label Size
                </label>
                <select
                  value={sizePresetId()}
                  onChange={(e) => setSizePresetId(e.currentTarget.value)}
                  class="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <For each={LABEL_SIZE_PRESETS}>
                    {(preset) => (
                      <option value={preset.id}>{preset.name}</option>
                    )}
                  </For>
                </select>
              </div>
            </div>

            {/* Items with copy count */}
            <div class="mb-6">
              <div class="mb-2 flex items-center justify-between">
                <label class="text-sm font-medium text-text-primary">
                  Items &amp; Copies
                </label>
                <Show when={props.items.length > 5}>
                  <div class="relative">
                    <svg
                      class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search items…"
                      value={searchTerm()}
                      onInput={(e) => setSearchTerm(e.currentTarget.value)}
                      class="w-48 rounded-lg border border-border-default bg-bg-surface py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                </Show>
              </div>
              <div class="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border-default p-3">
                <Show
                  when={filteredItems().length > 0}
                  fallback={
                    <p class="py-3 text-center text-sm text-text-muted">
                      No items match "{searchTerm()}"
                    </p>
                  }
                >
                  <For each={filteredItems()}>
                    {(item) => (
                      <div class="flex items-center gap-3">
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium text-text-primary">
                            {item.name}
                          </p>
                          <p class="text-xs text-text-secondary">
                            {item.unit}
                            <Show when={item.storehouse}>
                              {' · '}
                              {item.storehouse}
                            </Show>
                          </p>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="whitespace-nowrap text-xs text-text-muted">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <div class="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCopies(
                                item.id,
                                (itemCopies[item.id] || 1) - 1
                              )
                            }
                            class="flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary hover:bg-bg-hover"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="9999"
                            value={itemCopies[item.id] || 1}
                            onInput={(e) =>
                              updateCopies(
                                item.id,
                                parseInt(e.currentTarget.value) || 1
                              )
                            }
                            class="h-7 w-16 rounded border border-border-default bg-bg-surface text-center text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateCopies(
                                item.id,
                                (itemCopies[item.id] || 1) + 1
                              )
                            }
                            disabled={totalLabels() >= MAX_TOTAL_LABELS}
                            class="flex h-7 w-7 items-center justify-center rounded border border-border-default text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg-surface"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label class="mb-2 block text-sm font-medium text-text-primary">
                Preview
              </label>
              <div
                class={`rounded-lg border border-border-default bg-gray-50 p-4 ${
                  (activePreset().columns ?? 4) === 1
                    ? 'flex flex-col items-center gap-3'
                    : `grid gap-3`
                }`}
                style={{
                  'grid-template-columns':
                    (activePreset().columns ?? 4) > 1
                      ? `repeat(${activePreset().columns ?? 4}, 1fr)`
                      : undefined,
                }}
              >
                <For each={props.items.slice(0, 8)}>
                  {(item) => (
                    <BarcodeLabel
                      itemId={item.id}
                      itemName={item.name}
                      unit={item.unit}
                      storehouse={item.storehouse}
                      codeType={codeType()}
                      size={
                        (activePreset().columns ?? 4) >= 4
                          ? 'sm'
                          : (activePreset().columns ?? 4) >= 2
                            ? 'md'
                            : 'lg'
                      }
                    />
                  )}
                </For>
                <Show when={props.items.length > 8}>
                  <div class="col-span-full flex items-center justify-center py-2 text-xs text-text-muted">
                    … and {props.items.length - 8} more items
                  </div>
                </Show>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="flex items-center justify-between border-t border-border-default px-6 py-4">
            <p class="text-sm text-text-secondary">
              {totalLabels()} / {MAX_TOTAL_LABELS} label
              {totalLabels() !== 1 ? 's' : ''} · {activePreset().name}
            </p>
            <div class="flex gap-3">
              <Button variant="outline" onClick={() => props.onClose()}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPdf()}
              >
                <svg
                  class="mr-1.5 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                {isGeneratingPdf() ? 'Generating…' : 'Download PDF'}
              </Button>
              <Button variant="primary" onClick={handlePrint}>
                <svg
                  class="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Labels
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
};
