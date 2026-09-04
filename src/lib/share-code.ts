// ─── Share Snippet: encode the active script into a URL hash ──────────────────
// deflate-raw via CompressionStream (Chrome/Edge) with a plain base64url
// fallback. Output is fully local — nothing is uploaded anywhere.

export const SHARE_HASH_PREFIX = '#s=';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(data: string): Uint8Array<ArrayBuffer> {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Returns the hash fragment (including the leading '#') for the given code. */
export async function encodeSnippet(code: string): Promise<string> {
  const bytes = new TextEncoder().encode(code);
  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw'));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      return SHARE_HASH_PREFIX + 'z' + toBase64Url(compressed);
    } catch {
      // fall through to the uncompressed payload
    }
  }
  return SHARE_HASH_PREFIX + 'p' + toBase64Url(bytes);
}

/** Builds a full shareable URL for the current page with the code in the hash. */
export async function buildShareUrl(code: string): Promise<string> {
  const hash = await encodeSnippet(code);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/** Decodes a '#s=…' hash back into code. Returns null for foreign/invalid hashes. */
export async function decodeSnippet(hash: string): Promise<string | null> {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;
  const raw = hash.slice(SHARE_HASH_PREFIX.length);
  const mode = raw[0];
  const payload = raw.slice(1);
  if (!payload) return null;
  try {
    const bytes = fromBase64Url(payload);
    if (mode === 'z') {
      if (typeof DecompressionStream === 'undefined') return null;
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(stream).arrayBuffer());
    }
    if (mode === 'p') {
      return new TextDecoder().decode(bytes);
    }
    return null;
  } catch {
    return null;
  }
}
