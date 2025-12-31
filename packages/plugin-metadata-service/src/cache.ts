interface CacheEntry<T> {
  data: T;
  expires: number;
}

export class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttlMs: number;

  constructor(ttlSeconds: number = 3600) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    const expires = Date.now() + (ttlMs ?? this.ttlMs);
    this.cache.set(key, { data, expires });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove all expired entries
   */
  prune(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldest === null || entry.expires < oldest) {
        oldest = entry.expires;
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldest,
    };
  }
}
