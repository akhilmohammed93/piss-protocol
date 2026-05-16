const CACHE_NAME = 'piss-protocol-v1';

function isCacheSupported(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

async function cacheData(key: string, data: unknown): Promise<void> {
  if (!isCacheSupported()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
    await cache.put(key, response);
  } catch {
    /* Silently fail — offline cache is best-effort */
  }
}

async function getCachedData(key: string): Promise<unknown | null> {
  if (!isCacheSupported()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(key);
    if (!response) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ─── Highscores ───────────────────────────────────────────────────────────────
const HIGHSCORES_KEY = '/api/game/highscores';

export async function cacheHighscores(data: unknown): Promise<void> {
  return cacheData(HIGHSCORES_KEY, data);
}

export async function getCachedHighscores(): Promise<unknown | null> {
  return getCachedData(HIGHSCORES_KEY);
}

// ─── Level batches ────────────────────────────────────────────────────────────
function batchKey(batchNumber: number): string {
  return `/api/game/levels/batch/${batchNumber}`;
}

export async function cacheLevelBatch(batchNumber: number, data: unknown): Promise<void> {
  return cacheData(batchKey(batchNumber), data);
}

export async function getCachedLevelBatch(batchNumber: number): Promise<unknown | null> {
  return getCachedData(batchKey(batchNumber));
}
