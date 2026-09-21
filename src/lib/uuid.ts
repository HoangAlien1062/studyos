/**
 * RFC 4122 v4 UUID generator and validator
 * Ensures all entity IDs are valid UUIDs compatible with PostgreSQL UUID columns
 */

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a valid UUID. If the passed id is already a valid UUID, returns it.
 * Otherwise generates a new valid RFC 4122 v4 UUID.
 */
export function ensureUUID(id?: string | null): string {
  if (id && isValidUUID(id)) {
    return id.trim();
  }
  return generateUUID();
}
