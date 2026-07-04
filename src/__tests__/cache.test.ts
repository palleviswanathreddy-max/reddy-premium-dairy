/**
 * Cache Tests
 */

import { cache, CacheKeys } from '@/utils/cache';

describe('Cache Manager', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('set and get', () => {
    it('should store and retrieve data', () => {
      const data = { id: 1, name: 'Test' };
      cache.set('test-key', data);
      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should expire data after TTL', () => {
      jest.useFakeTimers();
      cache.set('expire-key', { data: 'test' }, 1000);
      expect(cache.get('expire-key')).not.toBeNull();
      
      jest.advanceTimersByTime(1100);
      expect(cache.get('expire-key')).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('has', () => {
    it('should check key existence', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete keys', () => {
      cache.set('delete-key', 'value');
      expect(cache.delete('delete-key')).toBe(true);
      expect(cache.get('delete-key')).toBeNull();
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate matching patterns', () => {
      cache.set('products:1', { id: 1 });
      cache.set('products:2', { id: 2 });
      cache.set('users:1', { id: 1 });

      const removed = cache.invalidatePattern('products:.*');
      expect(removed).toBe(2);
      expect(cache.has('products:1')).toBe(false);
      expect(cache.has('users:1')).toBe(true);
    });
  });

  describe('cache keys', () => {
    it('should generate consistent cache keys', () => {
      expect(CacheKeys.PRODUCT('123')).toBe('product:123');
      expect(CacheKeys.USER('user-abc')).toBe('user:user-abc');
      expect(CacheKeys.ORDERS('user-1')).toBe('orders:user-1');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      // Access keys to increment hit count
      cache.get('key1');
      cache.get('key1');
      cache.get('key2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.totalHits).toBeGreaterThan(0);
    });
  });
});
