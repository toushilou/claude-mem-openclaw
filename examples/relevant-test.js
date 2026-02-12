#!/usr/bin/env node

/**
 * 与我的实际记忆内容相关的真实场景测试
 * 只测试我记忆中实际存在的内容
 */

const { enhancedMemorySearch } = require('../src/enhanced_memory_search');
const MemorySystem = require('../src/memory_system');

async function runRelevantTest() {
  console.log('🎯 **与实际记忆相关的真实场景测试**');
  console.log('='.repeat(60));
  
  const relevantScenarios = [
    {
      name: "查询$CLAW铸造记录",
      query: "$CLAW",
      description: "查找$CLAW铸造的记录"
    },
    {
      name: "查询Moltbook相关",
      query: "Moltbook",
      description: "查找Moltbook社区参与记录"
    },
    {
      name: "查询技术研究",
      query: "技术研究",
      description: "查找技术研究相关内容"
    },
    {
      name: "查询每日记录",
      query: "日常记录",
      description: "查找日常工作和记录"
    },
    {
      name: "查询任务",
      query: "任务",
      description: "查找任务相关的记录"
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < relevantScenarios.length; i++) {
    const scenario = relevantScenarios[i];
    console.log(`\n🌍 场景 ${i + 1}: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    
    try {
      // 测试不同模式的搜索
      const fullResult = await enhancedMemorySearch(scenario.query, {
        mode: 'full',
        limit: 2,
        json: true
      });
      
      const compactResult = await enhancedMemorySearch(scenario.query, {
        mode: 'compact',
        limit: 2,
        json: true
      });
      
      // 记录结果
      results.push({
        scenario: scenario.name,
        query: scenario.query,
        fullCount: Array.isArray(fullResult.results) ? fullResult.results.length : 0,
        fullTokens: fullResult.totalTokens || 0,
        compactCount: Array.isArray(compactResult.results) ? compactResult.results.length : 0,
        compactTokens: compactResult.totalTokens || 0
      });
      
      const fullCount = Array.isArray(fullResult.results) ? fullResult.results.length : 0;
      const compactCount = Array.isArray(compactResult.results) ? compactResult.results.length : 0;
      console.log(`   ✅ 原始模式: ${fullCount}个结果`);
      console.log(`   ✅ 优化模式: ${compactCount}个结果`);
      
      if (fullResult.totalTokens && compactResult.totalTokens) {
        console.log(`   💰 节省: ${fullResult.totalTokens - compactResult.totalTokens} tokens`);
      }
      
    } catch (error) {
      console.error(`   ❌ 错误: ${error}`);
      results.push({
        scenario: scenario.name,
        query: scenario.query,
        fullCount: 0,
        fullTokens: 0,
        compactCount: 0,
        compactTokens: 0
      });
    }
  }
  
  console.log('\n📊 **测试结果汇总**');
  console.log('='.repeat(80));
  console.log('| 场景 | 查询 | 原始模式 | 优化模式 | 节省 |');
  console.log('|------|------|----------|----------|------|');
  
  results.forEach(result => {
    if (result.fullTokens > 0) {
      const saving = ((result.fullTokens - result.compactTokens) / result.fullTokens * 100).toFixed(0);
      console.log(`| ${result.scenario} | ${result.query} | ${result.fullCount}个 | ${result.compactCount}个 | ${saving}% |`);
    }
  });
  
  // 计算平均性能
  const validResults = results.filter(r => r.fullTokens > 0);
  const avgCoverage = validResults.reduce((sum, r) => sum + r.compactCount / r.fullCount * 100, 0) / validResults.length;
  const avgSaving = validResults.reduce((sum, r) => sum + ((r.fullTokens - r.compactTokens) / r.fullTokens * 100), 0) / validResults.length;
  
  if (validResults.length > 0) {
    console.log('\n🎯 **平均性能**');
    console.log('平均覆盖率:', avgCoverage.toFixed(0), '%');
    console.log('平均Token节省:', avgSaving.toFixed(0), '%');
    
    if (avgSaving > 50) {
      console.log('🎉 **显著优化**! Token使用节省超过50%');
    }
  }
  
  return validResults;
}

async function testMemorySystem() {
  console.log('\n📚 **测试分层记忆系统**');
  console.log('='.repeat(60));
  
  const system = new MemorySystem();
  
  // 测试分层搜索
  const layeredResult = await system.layeredSearch('$CLAW铸造', {
    includeFullDetails: true,
    limit: 3
  });
  
  console.log(`📊 分层搜索结果:`);
  console.log(`   阶段1: ${layeredResult.stage1?.count || 0}个索引结果`);
  console.log(`   阶段2: ${layeredResult.stage2?.length || 0}个摘要结果`);
  console.log(`   阶段3: ${layeredResult.stage3?.length || 0}个详细结果`);
  console.log(`   Token使用: ~${layeredResult.totalTokens}`);
  
  // 测试心跳检查
  const heartbeatResult = await system.heartbeatCheck('$CLAW铸造');
  
  console.log(`\n📈 心跳检查结果:`);
  console.log(`   找到: ${heartbeatResult.count}个结果`);
  console.log(`   Token使用: ~${heartbeatResult.totalTokens}`);
  
  return { layered: layeredResult, heartbeat: heartbeatResult };
}

async function runAllTests() {
  const startTime = Date.now();
  
  const searchResults = await runRelevantTest();
  const memorySystemResults = await testMemorySystem();
  
  const totalTime = Date.now() - startTime;
  
  console.log('\n✨ **综合评估**');
  console.log('='.repeat(60));
  console.log(`⏱️ 总测试时间: ${totalTime}ms`);
  console.log(`🎯 测试场景: 5个查询场景 + 记忆系统测试`);
  
  const successfulScenarios = searchResults.filter(r => r.fullCount > 0);
  console.log(`✅ 成功场景: ${successfulScenarios.length}/5个`);
  
  const validResults = searchResults.filter(r => r.fullTokens > 0);
  if (validResults.length > 0) {
    const avgSaving = validResults.reduce((sum, r) => sum + ((r.fullTokens - r.compactTokens) / r.fullTokens * 100), 0) / validResults.length;
    console.log(`📈 平均Token节省: ${avgSaving.toFixed(0)}%`);
  }
}

runAllTests().catch(error => {
  console.error('\n❌ **测试失败**:', error);
  process.exit(1);
});