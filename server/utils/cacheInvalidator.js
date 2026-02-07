/**
 * Cache Invalidation System
 * Automatically invalidates cache when data changes
 */

class CacheInvalidator {
  private static instance: CacheInvalidator;
  private invalidationRules = new Map<string, string[]>();

  static getInstance(): CacheInvalidator {
    if (!CacheInvalidator.instance) {
      CacheInvalidator.instance = new CacheInvalidator();
    }
    return CacheInvalidator.instance;
  }

  /**
   * Register invalidation rules
   */
  registerRule(table: string, patterns: string[]): void {
    this.invalidationRules.set(table, patterns);
  }

  /**
   * Invalidate cache when table data changes
   */
  invalidate(table: string): void {
    const patterns = this.invalidationRules.get(table);
    if (!patterns) return;

    const { CacheManager } = require('./cacheManager');
    const stats = CacheManager.getStats();
    
    for (const entry of stats.entries) {
      for (const pattern of patterns) {
        if (entry.key.includes(pattern)) {
          CacheManager.delete(entry.key);
          console.log(`🗑️ Cache invalidated: ${entry.key}`);
        }
      }
    }
  }

  /**
   * Setup default invalidation rules
   */
  setupDefaultRules(): void {
    this.registerRule('sets', ['shop-sets', 'sets']);
    this.registerRule('provider_sets', ['shop-sets', 'provider-sets']);
    this.registerRule('parts', ['shop-sets', 'sets', 'parts']);
    this.registerRule('orders', ['orders', 'payment-stats']);
    this.registerRule('users', ['users', 'provider-stats']);
  }
}

module.exports = CacheInvalidator.getInstance();

