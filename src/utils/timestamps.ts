/**
 * Versioned filename helper — replaces Flask's get_versioned_filename().
 * Reads config/last_updated.json (populated by `npm run timestamps`).
 *
 * In Astro build context we import the JSON directly.
 * In the browser (client-side scripts) we use the baked-in timestamp map
 * that is defined via Vite's `define` in astro.config.mjs.
 */

import timestampsRaw from '../../config/last_updated.json' assert { type: 'json' };

type TimestampEntry = {
  hash?: string;
  date_published?: string;
  date_modified?: string;
};

const timestamps: Record<string, TimestampEntry> = timestampsRaw as Record<string, TimestampEntry>;

export function getVersionedFilename(path: string): string {
  const entry = timestamps[path];
  if (entry?.hash) {
    return `${path}?v=${entry.hash}`;
  }
  return path;
}

export function getFileDateInfo(
  fileName: string,
  fileType: 'date_published' | 'date_modified' | 'hash'
): string | undefined {
  const today = new Date().toISOString();
  const entry = timestamps[fileName];
  if (fileType === 'date_published' || fileType === 'date_modified') {
    return entry?.[fileType] ?? today;
  }
  return entry?.hash;
}
