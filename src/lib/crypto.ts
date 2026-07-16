/**
 * Generates a SHA-256 hash of a string using the native Web Crypto API.
 * Safe to run in browser environments (main thread or Web Worker).
 */
export async function sha256(message: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Failed to compute SHA-256:', err);
    return Math.random().toString(36).substring(2); // Fallback to random identifier
  }
}
