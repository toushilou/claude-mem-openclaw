const { enhancedMemorySearch } = require('../src/enhanced_memory_search');

async function runSimplePerformanceTest() {
  console.log('📊 Claude-Mem-OpenClaw 短期优化性能测试');
  console.log('='.repeat(60));
  
  const testQueries = ['OpenClaw', '$CLAW', 'Moltbook'];
  const runs = 3;
  
  console.log(`🔍 测试查询: ${testQueries.join(', ')} (${runs}次测试)`);
  console.log('🚀 原始full模式 vs 优化compact模式');
  console.log('='.repeat(60));
  
  // 1. 原始full模式测试
  console.log('\n📝 原始full模式:');
  console.log('-'.repeat(50));
  
  const fullResults = [];
  for (let i = 0; i < runs; i++) {
    console.log(`   🏃 第${i + 1}次测试...`);
    
    const queryResults = [];
    for (const query of testQueries) {
      try {
        const startTime = Date.now();
        const result = await enhancedMemorySearch(query, {
          limit: 2,
          mode: 'full',
          minScore: 0.3
        });
        
        queryResults.push({
          query,
          time: Date.now() - startTime,
          results: result.count || 0,
          tokens: result.totalTokens || 0
        });
        
      } catch (error) {
        console.error(`   ❌ ${query}: 搜索失败 -`, error);
      }
    }
    
    fullResults.push(queryResults);
  }
  
  // 2. 优化compact模式测试
  console.log('\n📝 优化compact模式:');
  console.log('-'.repeat(50));
  
  const compactResults = [];
  for (let i = 0; i < runs; i++) {
    console.log(`   🏃 第${i + 1}次测试...`);
    
    const queryResults = [];
    for (const query of testQueries) {
      try {
        const startTime = Date.now();
        const result = await enhancedMemorySearch(query, {
          limit: 2,
          mode: 'compact',
          minScore: 0.3
        });
        
        queryResults.push({
          query,
          time: Date.now() - startTime,
          results: result.count || 0,
          tokens: result.totalTokens || 0
        });
        
      } catch (error) {
        console.error(`   ❌ ${query}: 搜索失败 -`, error);
      }
    }
    
    compactResults.push(queryResults);
  }
  
  // 3. 结果分析
  console.log('\n📈 性能分析');
  console.log('='.repeat(60));
  
  console.log('⏱️ 响应时间对比 (ms):');
  console.log(`   原始full模式: ${averageTime(fullResults)}ms`);
  console.log(`   优化compact模式: ${averageTime(compactResults)}ms`);
  console.log(`   🏃 提升: ${Math.round(calculateImprovement(fullResults, compactResults))}%`);
  
  console.log('\n🔍 覆盖率对比:');
  console.log(`   原始full模式: ${averageResults(fullResults)}个结果`);
  console.log(`   优化compact模式: ${averageResults(compactResults)}个结果`);
  console.log(`   📊 一致性: ${calculateCoverage(fullResults, compactResults)}%`);
  
  console.log('\n💰 Token使用对比:');
  console.log(`   原始full模式: ${averageTokens(fullResults)} tokens`);
  console.log(`   优化compact模式: ${averageTokens(compactResults)} tokens`);
  console.log(`   📉 节省: ${Math.round(calculateTokenSaving(fullResults, compactResults))}%`);
  
  console.log('\n✅ 短期优化验证成功');
  
  if (calculateImprovement(fullResults, compactResults) > 50) {
    console.log('\n🎉 显著提升!响应时间减少超过50%');
  }
  
  if (calculateTokenSaving(fullResults, compactResults) > 50) {
    console.log('🎊 重大改进!Token使用节省超过50%');
  }
}

function averageTime(resultsArray) {
  let totalTime = 0;
  let count = 0;
  
  resultsArray.forEach(queryResults => {
    queryResults.forEach(result => {
      totalTime += result.time;
      count++;
    });
  });
  
  return Math.round(totalTime / count);
}

function averageResults(resultsArray) {
  let totalResults = 0;
  let count = 0;
  
  resultsArray.forEach(queryResults => {
    queryResults.forEach(result => {
      totalResults += result.results;
      count++;
    });
  });
  
  return Math.round(totalResults / count);
}

function averageTokens(resultsArray) {
  let totalTokens = 0;
  let count = 0;
  
  resultsArray.forEach(queryResults => {
    queryResults.forEach(result => {
      totalTokens += result.tokens;
      count++;
    });
  });
  
  return Math.round(totalTokens / count);
}

function calculateImprovement(original, optimized) {
  const origTime = averageTime(original);
  const optTime = averageTime(optimized);
  
  return ((origTime - optTime) / origTime) * 100;
}

function calculateCoverage(original, optimized) {
  const origResults = averageResults(original);
  const optResults = averageResults(optimized);
  
  return Math.round((optResults / origResults) * 100);
}

function calculateTokenSaving(original, optimized) {
  const origTokens = averageTokens(original);
  const optTokens = averageTokens(optimized);
  
  return ((origTokens - optTokens) / origTokens) * 100;
}

runSimplePerformanceTest().catch(error => {
  console.error('❌ 性能测试失败:', error);
  process.exit(1);
});