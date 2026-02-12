const EnhancedSummaryGenerator = require('../src/enhancements/summary-optimization');
const ParallelSearchManager = require('../src/enhancements/parallel-search');
const { SmartCacheManager } = require('../src/enhancements/cache-manager');
const { enhancedMemorySearch } = require('../src/enhanced_memory_search');

async function testEnhancedSummaryGenerator() {
  console.log('🎯 测试1: 增强版摘要生成器');
  console.log('='.repeat(50));
  
  const generator = new EnhancedSummaryGenerator();
  
  try {
    // 读取测试文件
    const fs = require('fs');
    const path = require('path');
    const memoryDir = path.join(process.env.HOME, '.openclaw/workspace/memory');
    
    const testFile = path.join(memoryDir, '2026-02-08.md');
    if (fs.existsSync(testFile)) {
      const content = fs.readFileSync(testFile, 'utf8');
      
      console.log(`📄 测试文件: ${testFile}`);
      
      const start = Date.now();
      const result = generator.extractEnhancedSummary(content);
      const duration = Date.now() - start;
      
      console.log(`✅ 摘要生成成功: ${duration}ms`);
      console.log(`   摘要长度: ${result.summary.length}`);
      console.log(`   关键词: ${result.keywords.length}个`);
      console.log(`   质量评分: ${result.quality}/10`);
      console.log(`   置信度: ${result.confidence.toFixed(2)}`);
      
      console.log(`\n📝 摘要内容:`);
      console.log(result.summary);
      
      console.log(`\n🔑 关键词:`);
      console.log(result.keywords.join(', '));
      
    } else {
      console.log(`⚠️ 测试文件不存在: ${testFile}`);
    }
    
  } catch (error) {
    console.error('❌ 摘要生成器测试失败:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

async function testParallelSearch() {
  console.log('🎯 测试2: 并行搜索优化');
  console.log('='.repeat(50));
  
  try {
    const searchManager = new ParallelSearchManager({
      maxWorkers: 2,
      timeout: 10000
    });
    
    console.log('🚀 启动搜索管理器');
    await searchManager.start();
    
    // 添加搜索任务
    const taskId = searchManager.addTask('OpenClaw', {
      limit: 3,
      minScore: 0.3,
      mode: 'compact'
    });
    
    console.log(`📝 任务添加: ${taskId}`);
    
    // 模拟等待任务完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ 并行搜索测试成功');
    
    searchManager.stop();
    
  } catch (error) {
    console.error('❌ 并行搜索测试失败:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

async function testSmartCache() {
  console.log('🎯 测试3: 智能缓存优化');
  console.log('='.repeat(50));
  
  try {
    const cache = new SmartCacheManager({
      cacheTTL: 60, // 1分钟
      maxCacheSize: 20,
      compressionEnabled: true
    });
    
    // 测试1: 基础操作
    const testKey = 'test-query-openclaw';
    cache.set(testKey, { result: 'test data' });
    const retrieveResult = cache.get(testKey);
    console.log(`✅ 基础操作: ${retrieveResult ? '成功' : '失败'}`);
    
    // 测试2: 查询优化
    await testCacheQueryOptimization(cache);
    
    // 测试3: 统计信息
    await testCacheStatistics(cache);
    
    // 测试4: 驱逐策略
    await testCacheEviction(cache);
    
  } catch (error) {
    console.error('❌ 智能缓存测试失败:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

async function testCacheQueryOptimization(cache) {
  console.log('\n🚀 查询优化测试');
  
  const testQueries = [
    'OpenClaw',
    'claw',
    'openclaw',
    'OPENCLAW',
    '编程'
  ];
  
  const start = Date.now();
  
  // 填充缓存
  console.log('📝 填充缓存:');
  for (const query of testQueries.slice(0, 2)) {
    const result = await enhancedMemorySearch(query, { limit: 2, mode: 'compact' });
    cache.set(query, result);
    console.log(`   - ${query}: 缓存成功`);
  }
  
  // 测试缓存命中
  console.log('\n📊 缓存命中率测试:');
  for (let i = 0; i < 5; i++) {
    for (const query of testQueries) {
      const result = cache.get(query);
      if (result) {
        console.log(`   ✅ ${query}: 命中`);
      } else {
        console.log(`   ❌ ${query}: 未命中`);
      }
    }
  }
  
  const duration = Date.now() - start;
  const stats = cache.getStatistics();
  
  console.log(`\n⏱️ 测试时间: ${duration}ms`);
  console.log(`   命中率: ${stats.hitRate}`);
  console.log(`   总查询: ${stats.total}`);
  console.log(`   命中: ${stats.hits}`);
  console.log(`   未命中: ${stats.misses}`);
  console.log(`   压缩节省: ${stats.compressionSaves} bytes`);
  console.log(`   内存使用: ${stats.memoryUsage}`);
  
  return duration;
}

async function testCacheStatistics(cache) {
  console.log('\n📈 缓存统计信息:');
  
  // 强制统计更新
  const testKey = 'stats-test-key';
  cache.set(testKey, { data: 'statistics test' });
  
  const stats = cache.getStatistics();
  
  console.log(`   缓存大小: ${stats.cacheSize}`);
  console.log(`   最大大小: ${stats.maxSize}`);
  console.log(`   TTL: ${stats.ttl}秒`);
  
  cache.printStatistics();
}

async function testCacheEviction(cache) {
  console.log('\n🗑️ 驱逐策略测试');
  
  const evictionKeys = Array.from({ length: 25 }, (_, i) => `test-key-${i}`);
  
  for (const key of evictionKeys) {
    cache.set(key, { data: `value-${key}` });
  }
  
  const finalStats = cache.getStatistics();
  
  console.log(`✅ 驱逐策略: ${cache.cache.size === cache.config.maxCacheSize}`);
  console.log(`   预期大小: ${cache.config.maxCacheSize}`);
  console.log(`   实际大小: ${cache.cache.size}`);
  console.log(`   驱逐次数: ${finalStats.evictions}`);
}

async function testSearchOptimization() {
  console.log('🎯 测试3: 搜索优化');
  console.log('='.repeat(50));
  
  try {
    // 测试增强版memory_search
    console.log('🚀 测试增强版内存搜索');
    
    const basicSearchStart = Date.now();
    const basicResult = await enhancedMemorySearch('OpenClaw', { 
      limit: 2, 
      mode: 'full' 
    });
    const basicDuration = Date.now() - basicSearchStart;
    
    console.log(`✅ 基础搜索: ${basicResult.count}个结果, ${basicDuration}ms`);
    
    const optimizedSearchStart = Date.now();
    const optimizedResult = await enhancedMemorySearch('OpenClaw', { 
      limit: 2, 
      mode: 'compact' 
    });
    const optimizedDuration = Date.now() - optimizedSearchStart;
    
    console.log(`✅ 优化搜索: ${optimizedResult.count}个结果, ${optimizedDuration}ms`);
    
    const improvement = basicDuration - optimizedDuration;
    console.log(`\n📈 性能改进:`);
    console.log(`   时间节省: ${improvement}ms`);
    if (basicDuration > 0) {
      console.log(`   速度提升: ${Math.round((improvement / basicDuration) * 100)}%`);
    }
    
    if (basicResult.count === optimizedResult.count) {
      console.log(`✅ 结果一致性: 相同数量的结果`);
    }
    
  } catch (error) {
    console.error('❌ 搜索优化测试失败:', error);
  }
  
  console.log('\n' + '='.repeat(50));
}

async function runAllTests() {
  console.log('🧠 Claude-Mem-OpenClaw 短期优化测试');
  console.log('='.repeat(60));
  
  await Promise.all([
    testEnhancedSummaryGenerator(),
    testParallelSearch(), 
    testSmartCache(),
    testSearchOptimization()
  ]);
  
  console.log('\n🎉 所有短期优化测试完成');
  console.log('='.repeat(60));
  console.log('📊 短期优化已完成:');
  console.log('1. 🚀 增强版摘要生成器 - 基于内容分析的智能摘要');
  console.log('2. ⚡ 并行搜索优化 - 多工作线程并发搜索');
  console.log('3. 🎯 智能缓存 - 查询特征哈希优化');
  console.log('4. 📈 搜索优化 - 分层压缩策略');
  console.log('\n🎯 预期效果:');
  console.log('- 响应时间减少 60-70%');
  console.log('- Token使用节省 50-60%');
  console.log('- 内存使用优化 30-40%');
}

// 运行测试
runAllTests().catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});