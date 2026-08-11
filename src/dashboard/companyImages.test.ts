import { describe, expect, it } from 'vitest';
import {
  ACCEPTED_IMAGE_TYPES,
  formatBytes,
  IMAGE_ACCEPT_ATTRIBUTE,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from './companyImages';

/** A File of a given size without allocating the bytes twice over. */
function fakeFile(type: string, bytes: number, name = 'image'): File {
  const file = new File(['x'], name, { type });
  // File.size is read-only and derives from the parts; overriding it is the
  // only way to test the ceiling without holding megabytes in memory.
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
}

describe('validateImageFile', () => {
  it('accepts every type the picker offers, for both kinds', () => {
    for (const type of ACCEPTED_IMAGE_TYPES) {
      expect(validateImageFile(fakeFile(type, 100_000), 'logo')).toBeNull();
      expect(validateImageFile(fakeFile(type, 100_000), 'cover')).toBeNull();
    }
  });

  it('rejects a file that is not one of those image types', () => {
    // A PDF renamed to .png still arrives with its real MIME type.
    expect(validateImageFile(fakeFile('application/pdf', 1000), 'logo')).toMatch(
      /PNG, JPG, SVG or WebP/,
    );
    expect(validateImageFile(fakeFile('image/gif', 1000), 'cover')).toMatch(/PNG, JPG, SVG or WebP/);
  });

  it('gives the cover more room than the logo', () => {
    const threeMb = fakeFile('image/png', 3 * 1024 * 1024);
    // Same file, different verdict — that is the whole point of the two limits.
    expect(validateImageFile(threeMb, 'logo')).toMatch(/under 2 MB/);
    expect(validateImageFile(threeMb, 'cover')).toBeNull();
  });

  it('names the real size when a file is too big', () => {
    const error = validateImageFile(fakeFile('image/png', 8 * 1024 * 1024), 'logo');
    expect(error).toMatch(/8 MB/);
    expect(error).toMatch(/under 2 MB/);
  });

  it('accepts a file exactly on the ceiling', () => {
    // An off-by-one here rejects a file whose size the message calls legal.
    for (const kind of ['logo', 'cover'] as const) {
      expect(validateImageFile(fakeFile('image/png', MAX_IMAGE_BYTES[kind]), kind)).toBeNull();
      expect(validateImageFile(fakeFile('image/png', MAX_IMAGE_BYTES[kind] + 1), kind)).not.toBeNull();
    }
  });
});

describe('formatBytes', () => {
  it('switches unit where a person would', () => {
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    expect(formatBytes(400 * 1024)).toBe('400 KB');
  });
});

describe('IMAGE_ACCEPT_ATTRIBUTE', () => {
  it('offers exactly what validation accepts', () => {
    // Derived, not duplicated — a picker that offers GIFs the validator then
    // rejects is a trap the user falls into once per upload.
    expect(IMAGE_ACCEPT_ATTRIBUTE.split(',')).toEqual(ACCEPTED_IMAGE_TYPES);
  });
});
