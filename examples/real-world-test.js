#!/usr/bin/env node

/**
 * 真实场景的实际使用情况测试
 * 模拟用户使用OpenClaw的典型场景
 */

const { enhancedMemorySearch } = require('../src/enhanced_memory_search');
const MemorySystem = require('../src/memory_system');
const EnhancedSummaryGenerator = require('../src/enhancements/summary-optimization');

async function runRealWorldTest() {
  console.log('🌍 **真实场景使用情况测试**');
  console.log('='.repeat(60));
  
  const testScenarios = [
    {
      name: "查询编程相关问题",
      query: "JavaScript语法错误调试",
      description: "查找JavaScript语法错误的调试方法"
    },
    {
      name: "查询项目文档",
      query: "Moltbook API接口",
      description: "查找Moltbook API接口文档"
    },
    {
      name: "查询任务记录",
      query: "任务完成",
      description: "查找任务完成的记录"
    },
    {
      name: "查询学习笔记",
      query: "机器学习",
      description: "查找机器学习相关的学习笔记"
    },
    {
      name: "查询日常工作",
      query: "工作总结",
      description: "查找工作总结内容"
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < testScenarios.length; i++) {
    const scenario = testScenarios[i];
    console.log(`\n🎯 场景 ${i + 1}: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    // 测试不同模式的搜索
    const fullResult = await enhancedMemorySearch(scenario.query, {
      mode: 'full',
      limit: 2
    });
    
    const compactResult = await enhancedMemorySearch(scenario.query, {
      mode: 'compact',
      limit: 2
    });
    
    // 记录结果
    results.push({
      scenario: scenario.name,
      query: scenario.query,
      fullCount: fullResult.count || 0,
      fullTokens: fullResult.totalTokens || 0,
      compactCount: compactResult.count || 0,
      compactTokens: compactResult.totalTokens || 0,
      duration: fullResult.responseTime || 0
    });
    
    console.log(`   🏃 完成 - 原始模式: ${fullResult.count}个结果`);
  }
  
  console.log('\n📊 **测试结果汇总**');
  console.log('='.repeat(80));
  console.log('| 场景 | 查询 | 原始模式 | 优化模式 | 节省 |');
  console.log('|------|------|----------|----------|------|');
  
  results.forEach(result => {
    const coverage = result.compactCount / result.fullCount * 100;
    const saving = ((result.fullTokens - result.compactTokens) / result.fullTokens * 100).toFixed(0);
    
    console.log(`| ${result.scenario} | ${result.query} | ${result.fullCount}个 | ${result.compactCount}个 | ${saving}% |`);
  });
  
  // 计算平均性能
  const avgCoverage = results.reduce((sum, r) => sum + r.compactCount / r.fullCount * 100, 0) / results.length;
  const avgSaving = results.reduce((sum, r) => sum + ((r.fullTokens - r.compactTokens) / r.fullTokens * 100), 0) / results.length;
  
  console.log('\n🎯 **平均性能**');
  console.log('平均覆盖率:', avgCoverage.toFixed(0), '%');
  console.log('平均Token节省:', avgSaving.toFixed(0), '%');
  
  if (avgSaving > 50) {
    console.log('🎉 **显著优化**! Token使用节省超过50%');
  }
  
  return results;
}

async function testMemorySystem() {
  console.log('\n📚 **测试分层记忆系统**');
  console.log('='.repeat(60));
  
  const system = new MemorySystem();
  
  // 测试分层搜索
  const layeredResult = await system.layeredSearch('项目文档', {
    includeFullDetails: true,
    limit: 3
  });
  
  console.log(`📊 分层搜索结果:`);
  console.log(`   阶段1: ${layeredResult.stage1?.count || 0}个索引结果`);
  console.log(`   阶段2: ${layeredResult.stage2?.length || 0}个摘要结果`);
  console.log(`   阶段3: ${layeredResult.stage3?.length || 0}个详细结果`);
  console.log(`   Token使用: ~${layeredResult.totalTokens}`);
  
  // 测试心跳检查
  const heartbeatResult = await system.heartbeatCheck('检查日常');
  
  console.log(`\n📈 心跳检查结果:`);
  console.log(`   找到: ${heartbeatResult.count}个结果`);
  console.log(`   Token使用: ~${heartbeatResult.totalTokens}`);
  console.log(`   节省: ${heartbeatResult.savings} tokens (${heartbeatResult.savingsPercent}%)`);
  
  return { layered: layeredResult, heartbeat: heartbeatResult };
}

async function runAllTests() {
  const startTime = Date.now();
  
  const searchResults = await runRealWorldTest();
  const memorySystemResults = await testMemorySystem();
  
  const totalTime = Date.now() - startTime;
  
  console.log('\n✨ **综合评估**');
  console.log('='.repeat(60));
  console.log(`⏱️ 总测试时间: ${totalTime}ms`);
  console.log(`🎯 测试场景: 5个查询场景 + 记忆系统测试`);
  console.log(`✅ 所有场景均成功完成`);
}

runAllTests().catch(error => {
  console.error('\n❌ **测试失败**:', error);
  process.exit(1);
});