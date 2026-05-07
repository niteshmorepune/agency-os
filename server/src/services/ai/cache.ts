import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

const cache = new LRUCache<string, string>({
  max: 500,
  ttl: 86400 * 1000, // default 24h in ms
});

export function buildCacheKey(toolId: string, inputs: Record<string, string>): string {
  const payload = JSON.stringify({ toolId, ...inputs });
  return 'ai:' + crypto.createHash('sha256').update(payload).digest('hex');
}

export function getCached(key: string): string | undefined {
  return cache.get(key);
}

export function setCached(key: string, value: string, ttlSeconds: number): void {
  cache.set(key, value, { ttl: ttlSeconds * 1000 });
}

export function invalidate(key: string): void {
  cache.delete(key);
}
