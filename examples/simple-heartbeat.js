#!/usr/bin/env node

/**
 * 简单优化版心跳检查 - 专注于基本功能
 * 快速响应，最小token消耗
 */

const { enhancedMemorySearch } = require('../src/enhanced_memory_search');

async function runSimpleOptimizedHeartbeat() {
  console.log('🫀 **优化版心跳检查开始**');
  
  const startTime = Date.now();
  
  try {
    // 1. 快速检查最近的活动
    const quickResult = await enhancedMemorySearch('2026-02', {
      mode: 'compact',
      limit: 3,
      minScore: 0.1
    });
    
    console.log(`📊 心跳检查完成:`);
    console.log(`   查询: \"2026-02\"`);
    console.log(`   找到: ${quickResult.count} 个相关项目`);
    console.log(`   Token使用: ~${quickResult.totalTokens}`);
    console.log(`   耗时: ${Date.now() - startTime}ms`);
    
    // 2. 与传统方法对比
    const traditionalEstimate = 3000; // 传统方法约3000 tokens
    const savings = traditionalEstimate - quickResult.totalTokens;
    const savingsPercent = Math.round(savings / traditionalEstimate * 100);
    
    console.log(`💰 与传统方法对比:`);
    console.log(`   传统方法: ~${traditionalEstimate} tokens`);
    console.log(`   优化方法: ~${quickResult.totalTokens} tokens`);
    console.log(`   🔥 节省: ${savings} tokens (${savingsPercent}%)`);
    
    return {
      success: true,
      duration: Date.now() - startTime,
      tokens: quickResult.totalTokens,
      savingsPercent,
      results: quickResult.count
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
runSimpleOptimizedHeartbeat().catch(error => {
  console.error('❌ 心跳检查异常:', error);
  process.exit(1);
});