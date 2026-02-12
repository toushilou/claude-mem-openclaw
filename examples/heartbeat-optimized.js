#!/usr/bin/env node

/**
 * 优化版心跳检查 - 基于claude-mem分层压缩系统
 * 显著减少token消耗，提升响应速度
 */

const MemorySystem = require('../src/memory_system');
const EnhancedSummaryGenerator = require('../src/enhancements/summary-optimization');
const { getCacheManager } = require('../src/enhancements/cache-manager');

async function runOptimizedHeartbeat() {
  console.log('🫀 **优化版心跳检查开始**');
  
  const startTime = Date.now();
  
  try {
    // 1. 初始化优化组件
    const memorySystem = new MemorySystem({
      autoUpdateSummaries: false,
      useSummaryLibrary: true
    });
    
    const cache = getCacheManager({
      maxCacheSize: 50,
      cacheTTL: 300 // 5分钟
    });
    
    // 2. 快速心跳检查
    console.log('📊 阶段1: 索引层快速检查');
    const quickResult = await memorySystem.search('最近的记忆', {
      mode: 'index',
      limit: 5,
      minScore: 0.2
    });
    
    console.log(`   找到 ${quickResult.count} 个索引结果`);
    
    // 3. 智能内容分析
    if (quickResult.count > 0) {
      console.log('📊 阶段2: 摘要层详细分析');
      
      const generator = new EnhancedSummaryGenerator({
        summaryLength: 120,
        keywordsCount: 3
      });
      
      // 分析前几个结果
      const keyResults = quickResult.results.slice(0, 3);
      const analysisResults = [];
      
      for (const result of keyResults) {
        const analysis = generator.analyzeContent(result.content || '');
        const quality = generator.evaluateContentQuality(analysis);
        
        analysisResults.push({
          id: result.id,
          title: result.title,
          score: quality.score,
          confidence: quality.confidence || 0.5
        });
        
        console.log(`   ✅ ${result.title}: ${quality.score}/10分`);
      }
      
      // 4. 验证质量
      const highQualityResults = analysisResults.filter(r => r.score > 6);
      if (highQualityResults.length > 0) {
        console.log(`🎉 发现 ${highQualityResults.length} 个高质量结果`);
      }
    }
    
    // 5. 性能统计
    const duration = Date.now() - startTime;
    const stats = cache.getStatistics();
    
    console.log('📊 **心跳检查完成报告**');
    console.log(`   🕐 响应时间: ${duration}ms`);
    console.log(`   💰 Token使用: ~${Math.round(quickResult.totalTokens || 0)}`);
    console.log(`   📈 命中率: ${stats.hitRate}`);
    console.log(`   🔥 节省: ${Math.round((3000 - (quickResult.totalTokens || 0)) / 3000 * 100)}%`);
    
    // 6. 传统方法对比
    const traditionalEstimate = 3000;
    const optimizedTokens = quickResult.totalTokens || 0;
    const savings = traditionalEstimate - optimizedTokens;
    const savingsPercent = Math.round(savings / traditionalEstimate * 100);
    
    console.log('💰 **传统方法对比**');
    console.log(`   传统方法: ~${traditionalEstimate} tokens`);
    console.log(`   优化方法: ~${optimizedTokens} tokens`);
    console.log(`   🔥 节省: ${savings} tokens (${savingsPercent}%)`);
    
    return {
      success: true,
      duration,
      tokens: optimizedTokens,
      savingsPercent,
      results: quickResult.count,
      cacheStats: stats
    };
    
  } catch (error) {
    console.error('❌ 心跳检查失败:', error);
    
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

// 主程序
runOptimizedHeartbeat().catch(error => {
  console.error('❌ 心跳检查异常:', error);
  process.exit(1);
});