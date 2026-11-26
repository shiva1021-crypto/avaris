// Persistent, same-origin cache for the scene's static assets. The page can be
// reloaded without re-downloading the character model or the Earth mask.

const CACHE_NAME = 'mybi-digital-scene-v1';
const pending = new Map<string, Promise<ArrayBuffer>>();

async function readCached(url: string): Promise<ArrayBuffer | undefined> {
  if (typeof caches === 'undefined') return undefined;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(url);
    return response ? await response.arrayBuffer() : undefined;
  } catch {
    return undefined;
  }
}

async function writeCached(url: string, buffer: ArrayBuffer, contentType: string | null) {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const headers = new Headers();
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    // Copy the buffer so the caller's copy stays available to GLTFLoader.
    await cache.put(url, new Response(buffer.slice(0), { headers }));
  } catch {
    // Storage can be unavailable or full; the scene still works from memory.
  }
}

/** Fetch once per page session and keep the bytes in the Cache API for reloads. */
export function loadCachedBinary(url: string): Promise<ArrayBuffer> {
  const existing = pending.get(url);
  if (existing) return existing;

  const task = (async () => {
    const cached = await readCached(url);
    if (cached) return cached;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`The asset could not be loaded: ${url}`);
    const buffer = await response.arrayBuffer();
    await writeCached(url, buffer, response.headers.get('content-type'));
    return buffer;
  })();

  pending.set(url, task);
  task.catch(() => {
    if (pending.get(url) === task) pending.delete(url);
  });
  return task;
}

/** Warm the cache early without blocking the caller. */
export function preloadCachedBinary(url: string) {
  void loadCachedBinary(url).catch(() => { /* The loader reports real failures. */ });
}
