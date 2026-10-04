import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HTMLCanvasElementLuminanceSource,
  HybridBinarizer,
  MultiFormatReader,
  PDF417Reader,
} from '@zxing/library';

/**
 * ZXing readers for identity documents.
 *
 * The SA driver's licence PDF417 is dense (720 bytes), so frames must be
 * decoded at full resolution and without aspect distortion. ZXing is used
 * instead of the native BarcodeDetector for PDF417 because the native API only
 * exposes a UTF-8 decoded `rawValue`, which destroys the licence's binary data.
 */
const pdf417Hints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.PDF_417]],
]);

const otherHints = new Map<DecodeHintType, unknown>([
  [DecodeHintType.TRY_HARDER, true],
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.CODE_128, BarcodeFormat.CODE_39],
  ],
]);

const pdf417Reader = new PDF417Reader();
const otherReader = new MultiFormatReader();
otherReader.setHints(otherHints);

function bitmapFrom(canvas: HTMLCanvasElement): BinaryBitmap {
  return new BinaryBitmap(new HybridBinarizer(new HTMLCanvasElementLuminanceSource(canvas)));
}

/** Decodes a PDF417 symbol from the canvas. Returns null when none is found. */
export function decodePdf417(canvas: HTMLCanvasElement): string | null {
  try {
    return pdf417Reader.decode(bitmapFrom(canvas), pdf417Hints).getText() || null;
  } catch {
    return null;
  } finally {
    pdf417Reader.reset();
  }
}

/** Decodes PDF417 first (licence / Smart ID), then other 1D/2D formats. */
export function decodeDocumentBarcode(canvas: HTMLCanvasElement): string | null {
  const pdf = decodePdf417(canvas);
  if (pdf) return pdf;
  try {
    return otherReader.decodeWithState(bitmapFrom(canvas)).getText() || null;
  } catch {
    return null;
  } finally {
    otherReader.reset();
  }
}

/**
 * Draws a source into a canvas at up to `maxSide` pixels on the long edge,
 * preserving aspect ratio. Optionally crops to `crop` (source pixels).
 */
export function drawToCanvas(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxSide: number,
  crop?: { x: number; y: number; width: number; height: number }
): CanvasRenderingContext2D | null {
  const sx = Math.max(0, Math.floor(crop?.x ?? 0));
  const sy = Math.max(0, Math.floor(crop?.y ?? 0));
  const sw = Math.min(srcWidth - sx, Math.ceil(crop?.width ?? srcWidth));
  const sh = Math.min(srcHeight - sy, Math.ceil(crop?.height ?? srcHeight));
  if (sw <= 0 || sh <= 0) return null;

  // Downscale big frames, upscale small crops so modules stay >= ~2px.
  const scale = Math.min(maxSide / Math.max(sw, sh), crop ? 2 : 1);
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return ctx;
}

/** Loads a data URL into an image element. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/** Tries to read a document barcode from a still photo at a few scales. */
export async function decodeDocumentBarcodeFromImage(dataUrl: string): Promise<string | null> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  for (const maxSide of [2400, 1600, 1100]) {
    if (!drawToCanvas(canvas, img, img.naturalWidth, img.naturalHeight, maxSide)) continue;
    const text = decodeDocumentBarcode(canvas);
    if (text) return text;
  }
  return null;
}
