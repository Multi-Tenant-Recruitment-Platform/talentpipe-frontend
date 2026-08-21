import type { CompanyImageKind } from '../api/types';

/**
 * Client-side rules for the company's images.
 *
 * <p>Checking the file here is a courtesy, not a control: it turns "upload
 * failed" into "that file is 8 MB, the limit is 2 MB" before anything crosses
 * the network. The backend must re-check everything — a browser check is only
 * ever advice.</p>
 */

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

/** What the file picker offers, derived so the two can never drift apart. */
export const IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * A cover is a wide banner and a logo is a small square, so the cover gets
 * more room. Both are small enough to keep the profile page quick to paint.
 */
export const MAX_IMAGE_BYTES: Record<CompanyImageKind, number> = {
  logo: 2 * 1024 * 1024,
  cover: 4 * 1024 * 1024,
};

export const IMAGE_HINTS: Record<CompanyImageKind, string> = {
  logo: 'Square images look best.',
  cover: 'A wide image works best — around 1600×400.',
};

export const IMAGE_LABELS: Record<CompanyImageKind, string> = {
  logo: 'Company logo',
  cover: 'Cover image',
};

const MB = 1024 * 1024;

/** '2 MB', '512 KB' — sized for an error message, not for precision. */
export function formatBytes(bytes: number): string {
  return bytes >= MB ? `${Math.round((bytes / MB) * 10) / 10} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

/** Returns the reason this file cannot be used, or null when it is fine. */
export function validateImageFile(file: File, kind: CompanyImageKind): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Choose a PNG, JPG, SVG or WebP image.';
  }
  const ceiling = MAX_IMAGE_BYTES[kind];
  if (file.size > ceiling) {
    return `That image is ${formatBytes(file.size)}. Choose one under ${formatBytes(ceiling)}.`;
  }
  return null;
}

/**
 * Reads a picked file into a data URL for the preview.
 *
 * <p>A data URL rather than `URL.createObjectURL` on purpose: object URLs must
 * be revoked or they leak, and they die with the document, so a preview built
 * on one cannot survive being handed to the API layer.</p>
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // readAsDataURL always yields a string; the guard states that rather
    // than stringifying an ArrayBuffer into '[object ArrayBuffer]'.
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('That image could not be read. Try another file.'));
      }
    };
    reader.onerror = () => reject(new Error('That image could not be read. Try another file.'));
    reader.readAsDataURL(file);
  });
}
