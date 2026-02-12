/**
 * 智能缓存优化 - 短期优化3
 * 优化搜索结果缓存策略，提高重复查询速度
 */

class SmartCacheManager {
  constructor(options = {}) {
    this.config = {
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 300, // 5分钟
      maxCacheSize: options.maxCacheSize || 100,
      compressionEnabled: options.compressionEnabled !== false,
      statisticsEnabled: options.statisticsEnabled !== false,
      evictionStrategy: options.evictionStrategy || 'LRU',
      ...options
    };
    
    this.cache = new Map();
    this.accessCount = new Map();
    this.lastAccess = new Map();
    this.statistics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      compressionSaves: 0
    };
    
    this.startCleanupTimer();
    
    console.log('🎯 智能缓存管理器初始化');
    console.log(`   配置: ${this.config.maxCacheSize}条, ${this.config.cacheTTL}秒TTL, ${this.config.evictionStrategy}策略`);
  }
  
  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cacheTTL * 1000 / 2);
    
    console.log(`⏰ 缓存清理定时器启动: ${this.config.cacheTTL/2}秒检查一次`);
  }
  
  /**
   * 停止清理定时器
   */
  stopCleanupTimer() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
  
  /**
   * 清理过期条目
   */
  cleanupExpiredEntries() {
    const now = Date.now();
    let evictions = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTTL * 1000) {
        this.cache.delete(key);
        this.accessCount.delete(key);
        this.lastAccess.delete(key);
        evictions++;
      }
    }
    
    if (evictions > 0) {
      this.statistics.evictions += evictions;
      console.log(`🗑️ 清理了 ${evictions} 个过期缓存条目`);
    }
  }
  
  /**
   * 添加到缓存
   */
  set(key, value, options = {}) {
    if (!this.config.cacheEnabled) return;
    
    const entry = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.cacheTTL,
      size: this.calculateSize(value),
      compressed: false
    };
    
    // 检查是否需要压缩
    if (this.config.compressionEnabled && entry.size > 10000) {
      entry.value = this.compress(value);
      entry.compressed = true;
      entry.originalSize = entry.size;
      entry.size = this.calculateSize(entry.value);
      this.statistics.compressionSaves += entry.originalSize - entry.size;
    }
    
    // 检查是否需要驱逐
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictEntry();
    }
    
    this.cache.set(key, entry);
    this.accessCount.set(key, 1);
    this.lastAccess.set(key, Date.now());
    
    this.statistics.memoryUsage += entry.size;
  }
  
  /**
   * 从缓存获取
   */
  get(key) {
    if (!this.config.cacheEnabled) return null;
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.statistics.misses++;
      return null;
    }
    
    // 检查过期
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.lastAccess.delete(key);
      this.statistics.memoryUsage -= entry.size;
      this.statistics.misses++;
      return null;
    }
    
    // 更新访问统计
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.lastAccess.set(key, Date.now());
    this.statistics.hits++;
    
    // 解压数据
    const value = entry.compressed ? this.decompress(entry.value) : entry.value;
    
    return value;
  }
  
  /**
   * 驱逐策略
   */
  evictEntry() {
    let entryToEvict;
    
    switch (this.config.evictionStrategy) {
      case 'LRU':
        entryToEvict = this.findLRUEntry();
        break;
        
      case 'LFU':
        entryToEvict = this.findLFUEntry();
        break;
        
      case 'FIFO':
        entryToEvict = this.findFIFOEntry();
        break;
        
      default:
        entryToEvict = this.findLRUEntry();
    }
    
    if (entryToEvict) {
      this.cache.delete(entryToEvict);
      this.accessCount.delete(entryToEvict);
      this.lastAccess.delete(entryToEvict);
      this.statistics.evictions++;
    }
  }
  
  /**
   * LRU（最近最少使用）
   */
  findLRUEntry() {
    let oldestTime = Infinity;
    let oldestKey = null;
    
    for (const [key, time] of this.lastAccess.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * LFU（最少使用频率）
   */
  findLFUEntry() {
    let minCount = Infinity;
    let minCountKeys = [];
    
    for (const [key, count] of this.accessCount.entries()) {
      if (count < minCount) {
        minCount = count;
        minCountKeys = [key];
      } else if (count === minCount) {
        minCountKeys.push(key);
      }
    }
    
    // 如果有多个条目，使用LRU
    if (minCountKeys.length > 1) {
      let oldestTime = Infinity;
      let oldestKey = null;
      
      for (const key of minCountKeys) {
        const time = this.lastAccess.get(key);
        if (time < oldestTime) {
          oldestTime = time;
          oldestKey = key;
        }
      }
      
      return oldestKey;
    }
    
    return minCountKeys[0];
  }
  
  /**
   * FIFO（先进先出）
   */
  findFIFOEntry() {
    let oldestTime = Infinity;
    let oldestKey = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * 压缩数据
   */
  compress(data) {
    try {
      const json = JSON.stringify(data);
      const buffer = Buffer.from(json);
      return buffer.toString('base64');
    } catch (error) {
      console.error('❌ 数据压缩失败:', error);
      return data;
    }
  }
  
  /**
   * 解压数据
   */
  decompress(data) {
    try {
      const buffer = Buffer.from(data, 'base64');
      const json = buffer.toString('utf8');
      return JSON.parse(json);
    } catch (error) {
      console.error('❌ 数据解压失败:', error);
      return null;
    }
  }
  
  /**
   * 计算大小
   */
  calculateSize(data) {
    try {
      const json = JSON.stringify(data);
      return Buffer.from(json).length;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * 获取统计信息
   */
  getStatistics() {
    const total = this.statistics.hits + this.statistics.misses;
    const hitRate = total > 0 ? (this.statistics.hits / total * 100).toFixed(1) : 0;
    
    return {
      hits: this.statistics.hits,
      misses: this.statistics.misses,
      total: total,
      hitRate: `${hitRate}%`,
      evictions: this.statistics.evictions,
      compressionSaves: this.statistics.compressionSaves,
      memoryUsage: `${(this.statistics.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      cacheSize: this.cache.size,
      maxSize: this.config.maxCacheSize,
      ttl: this.config.cacheTTL
    };
  }
  
  /**
   * 打印统计信息
   */
  printStatistics() {
    const stats = this.getStatistics();
    
    console.log('📊 缓存统计信息:');
    console.log(`   命中率: ${stats.hitRate}`);
    console.log(`   总查询: ${stats.total}`);
    console.log(`   命中: ${stats.hits}`);
    console.log(`   未命中: ${stats.misses}`);
    console.log(`   驱逐: ${stats.evictions}`);
    console.log(`   压缩节省: ${stats.compressionSaves} bytes`);
    console.log(`   内存使用: ${stats.memoryUsage}`);
    console.log(`   缓存大小: ${stats.cacheSize}/${stats.maxSize}`);
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
    this.statistics.memoryUsage = 0;
    console.log('🧹 缓存已清空');
  }
  
  /**
   * 停止缓存管理器
   */
  stop() {
    this.stopCleanupTimer();
    this.clear();
    console.log('🛑 缓存管理器已停止');
  }
}

/**
 * 高级搜索缓存 - 使用查询特征哈希
 */
class QueryFeatureCache extends SmartCacheManager {
  constructor(options = {}) {
    super(options);
    this.featureExtractor = options.featureExtractor || this.defaultFeatureExtractor;
  }
  
  /**
   * 默认特征提取器
   */
  defaultFeatureExtractor(query) {
    const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    words.sort();
    
    let hash = 0;
    for (const word of words) {
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash |= 0;
      }
    }
    
    return hash.toString();
  }
  
  /**
   * 特征化查询
   */
  feature(query) {
    return this.featureExtractor(query);
  }
  
  /**
   * 特征化缓存操作
   */
  getByFeatures(query) {
    const key = this.feature(query);
    return this.get(key);
  }
  
  /**
   * 设置特征化缓存
   */
  setByFeatures(query, value, options = {}) {
    const key = this.feature(query);
    this.set(key, value, options);
  }
}

/**
 * 创建缓存实例
 */
let defaultCacheInstance = null;

function getCacheManager(options = {}) {
  if (!defaultCacheInstance) {
    defaultCacheInstance = new QueryFeatureCache(options);
  }
  return defaultCacheInstance;
}

/**
 * 简化的API方法
 */
async function cachedOperation(key, operation, ttl = null) {
  const cache = getCacheManager();
  
  let result = cache.get(key);
  if (result !== null) {
    return result;
  }
  
  try {
    result = await operation();
    cache.set(key, result, ttl ? { ttl } : undefined);
  } catch (error) {
    console.error('❌ 缓存操作失败:', error);
    throw error;
  }
  
  return result;
}

module.exports = {
  SmartCacheManager,
  QueryFeatureCache,
  getCacheManager,
  cachedOperation
};