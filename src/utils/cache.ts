/**
 * Caching Layer
 * In-memory caching with TTL and various strategies
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hits: number;
}

class CacheManager {
  private store: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxEntries = 500;

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    // Simple LRU: remove oldest entry if cache is full
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      hits: 0
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  getStats() {
    const entries = Array.from(this.store.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    const averageHits = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.store.size,
      totalHits,
      averageHits,
      maxEntries: this.maxEntries
    };
  }
}

export const cache = new CacheManager();

/**
 * HTTP Caching Headers
 */
export function setCacheHeaders(
  statusCode: number,
  maxAge = 300, // 5 minutes default
  revalidate = false
) {
  return {
    'Cache-Control': revalidate
      ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`
      : `public, max-age=${maxAge}`,
    'ETag': generateETag(Date.now().toString()),
    'Vary': 'Accept-Encoding'
  };
}

function generateETag(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(36)}"`;
}

/**
 * Query Result Caching
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 5 * 60 * 1000
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached) return cached;

  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}

/**
 * Cache Keys Generator
 */
export const CacheKeys = {
  PRODUCTS: (filters?: string) => `products:${filters || 'all'}`,
  PRODUCT: (id: string) => `product:${id}`,
  USER: (id: string) => `user:${id}`,
  ORDERS: (userId: string) => `orders:${userId}`,
  CATEGORIES: () => 'categories',
  STATS: (range?: string) => `stats:${range || 'all'}`,
  SEARCH: (query: string) => `search:${query.toLowerCase()}`
};
