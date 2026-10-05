/**
 * Utility to extract, crop, and optimize driver photos from scanned identity documents.
 */

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export type BoxInput =
  | [number, number, number, number]
  | BoundingBox
  | null
  | undefined;

/** Loads a base64 or URL string into an HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Crops the driver portrait from a scanned document (driver's licence or ID card).
 *
 * If Gemini returns a faceBoundingBox, we crop to that box with generous portrait padding.
 * If no box is provided, we inspect the aspect ratio:
 * - If wide (card landscape): standard RSA driver licence and Smart ID layout puts the portrait on the left side (~4% to ~38% width, ~15% to ~85% height).
 * - If square or portrait: scaled and centered nicely.
 */
export async function cropDriverPhoto(
  imageBase64: string,
  box?: BoxInput
): Promise<string> {
  try {
    const img = await loadImage(imageBase64);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    if (!iw || !ih) return imageBase64;

    let sx = 0;
    let sy = 0;
    let sw = iw;
    let sh = ih;

    if (box) {
      let ymin = 0;
      let xmin = 0;
      let ymax = 1000;
      let xmax = 1000;

      if (Array.isArray(box)) {
        [ymin, xmin, ymax, xmax] = box;
      } else {
        ymin = box.ymin;
        xmin = box.xmin;
        ymax = box.ymax;
        xmax = box.xmax;
      }

      // Convert 0..1000 or 0..1 to fraction 0..1
      const is0to1 = ymax <= 1.05 && xmax <= 1.05;
      const normYmin = is0to1 ? ymin : ymin / 1000;
      const normXmin = is0to1 ? xmin : xmin / 1000;
      const normYmax = is0to1 ? ymax : ymax / 1000;
      const normXmax = is0to1 ? xmax : xmax / 1000;

      const rawW = (normXmax - normXmin) * iw;
      const rawH = (normYmax - normYmin) * ih;

      // Add a little breathing room around the face for an ID-badge portrait
      const padX = rawW * 0.18;
      const padY = rawH * 0.22;

      sx = Math.max(0, normXmin * iw - padX);
      sy = Math.max(0, normYmin * ih - padY);
      sw = Math.min(iw - sx, rawW + padX * 2);
      sh = Math.min(ih - sy, rawH + padY * 2);
    } else {
      // Fallback heuristics: if it's a wide landscape card photo
      const ratio = iw / ih;
      if (ratio > 1.25) {
        // RSA Driver License & Smart ID: Photo is on the left side
        sx = Math.floor(iw * 0.03);
        sy = Math.floor(ih * 0.12);
        sw = Math.floor(iw * 0.38);
        sh = Math.floor(ih * 0.76);
      } else {
        // Direct driver photo taken by gate officer
        sx = 0;
        sy = 0;
        sw = iw;
        sh = ih;
      }
    }

    const canvas = document.createElement('canvas');
    // Crisp square portrait output
    const targetSize = 256;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return imageBase64;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Cover fit inside square
    const aspect = sw / sh;
    let dx = 0;
    let dy = 0;
    let dw = targetSize;
    let dh = targetSize;

    if (aspect > 1) {
      dw = targetSize * aspect;
      dx = (targetSize - dw) / 2;
    } else {
      dh = targetSize / aspect;
      dy = (targetSize - dh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn('Failed to crop driver photo, returning raw image:', err);
    return imageBase64;
  }
}
