/**
 * Barcode / QR Code generation utilities.
 *
 * Uses:
 *  - `qrcode` (toDataURL) for QR codes
 *  - `jsbarcode` (SVG rendering) for Code128 barcodes
 *
 * Both encode an arbitrary string (typically the MongoDB _id of an item).
 */

import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

// ── QR Code ──────────────────────────────────────────────

export interface QRCodeOptions {
  /** Size in pixels (width = height). Default 200 */
  size?: number;
  /** Error correction level. Default 'M' */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Margin (quiet zone) in modules. Default 2 */
  margin?: number;
  /** Dark colour. Default '#000000' */
  color?: string;
  /** Background colour. Default '#ffffff' */
  background?: string;
}

/**
 * Generate a QR code as a PNG data-URL.
 */
export async function generateQRDataURL(
  value: string,
  opts: QRCodeOptions = {}
): Promise<string> {
  const {
    size = 200,
    errorCorrectionLevel = 'M',
    margin = 2,
    color = '#000000',
    background = '#ffffff',
  } = opts;

  return QRCode.toDataURL(value, {
    width: size,
    margin,
    errorCorrectionLevel,
    color: { dark: color, light: background },
  });
}

// ── Barcode (Code128) ────────────────────────────────────

export interface BarcodeOptions {
  /** Width of narrowest bar in px. Default 2 */
  width?: number;
  /** Height of bars in px. Default 60 */
  height?: number;
  /** Show text under bars. Default true */
  displayValue?: boolean;
  /** Font size for text. Default 14 */
  fontSize?: number;
  /** Margin in px. Default 10 */
  margin?: number;
}

/**
 * Generate a Code128 barcode as an SVG string.
 * We draw into an in-memory SVG element and serialise it.
 */
export function generateBarcodeSVG(
  value: string,
  opts: BarcodeOptions = {}
): string {
  const {
    width = 2,
    height = 60,
    displayValue = true,
    fontSize = 14,
    margin = 10,
  } = opts;

  // Create a detached SVG element
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');

  JsBarcode(svg, value, {
    format: 'CODE128',
    width,
    height,
    displayValue,
    fontSize,
    margin,
    background: '#ffffff',
    lineColor: '#000000',
  });

  return new XMLSerializer().serializeToString(svg);
}

/**
 * Generate a Code128 barcode as a data-URL (image/svg+xml).
 */
export function generateBarcodeDataURL(
  value: string,
  opts: BarcodeOptions = {}
): string {
  const svg = generateBarcodeSVG(value, opts);
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ── Label types ──────────────────────────────────────────

export type CodeType = 'qr' | 'barcode';
export type LabelFormat = 'a4' | 'thermal';

export interface LabelItem {
  id: string;
  name: string;
  unit: string;
  /** Storehouse / location name */
  storehouse?: string;
  /** Current stock quantity */
  quantity: number;
  /** How many copies to print */
  copies: number;
}

// ── Label size presets ───────────────────────────────────

export interface LabelSizePreset {
  id: string;
  name: string;
  /** Width in mm */
  width: number;
  /** Height in mm */
  height: number;
  /** Columns per A4 page (auto-calculated if omitted) */
  columns?: number;
}

export const LABEL_SIZE_PRESETS: LabelSizePreset[] = [
  {
    id: 'default-a4',
    name: 'A4 Default (48×30mm)',
    width: 48,
    height: 30,
    columns: 4,
  },
  { id: '40x30', name: '40×30mm', width: 40, height: 30, columns: 4 },
  { id: '50x25', name: '50×25mm', width: 50, height: 25, columns: 3 },
  { id: '60x40', name: '60×40mm', width: 60, height: 40, columns: 3 },
  { id: '70x50', name: '70×50mm', width: 70, height: 50, columns: 2 },
  {
    id: 'thermal',
    name: 'Thermal 80mm (70×auto)',
    width: 70,
    height: 0,
    columns: 1,
  },
];

// ── Settings persistence ─────────────────────────────────

const SETTINGS_KEY = 'label-print-settings';

export interface LabelPrintSettings {
  codeType: CodeType;
  labelFormat: LabelFormat;
  sizePresetId: string;
}

const DEFAULT_SETTINGS: LabelPrintSettings = {
  codeType: 'qr',
  labelFormat: 'a4',
  sizePresetId: 'default-a4',
};

export function loadLabelSettings(): LabelPrintSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveLabelSettings(settings: Partial<LabelPrintSettings>): void {
  const current = loadLabelSettings();
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ ...current, ...settings })
  );
}

// ── Helpers ──────────────────────────────────────────────

export function truncateId(id: string, max = 12): string {
  if (id.length <= max) return id;
  return `${id.slice(0, 6)}\u2026${id.slice(-4)}`;
}
