import CryptoJS from 'crypto-js';

/**
 * Generates a SHA256 hash of a Uint8Array (Yjs snapshot).
 */
export function generateSnapshotHash(snapshot: Uint8Array): string {
  // Convert Uint8Array to WordArray for CryptoJS
  const wordArray = CryptoJS.lib.WordArray.create(snapshot as any);
  return CryptoJS.SHA256(wordArray).toString();
}

/**
 * Validates the integrity of a snapshot against its stored hash.
 */
export function validateSnapshotIntegrity(snapshot: Uint8Array, storedHash: string): boolean {
  const currentHash = generateSnapshotHash(snapshot);
  return currentHash === storedHash;
}
