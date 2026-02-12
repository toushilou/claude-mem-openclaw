#!/usr/bin/env node

/**
 * 调试搜索返回结果的结构
 */

const { enhancedMemorySearch } = require('../src/enhanced_memory_search');

async function debugSearchResult() {
  console.log('🔍 **调试搜索返回结果**');
  console.log('='.repeat(60));
  
  const queries = ['$CLAW', 'Moltbook'];
  
  for (const query of queries) {
    console.log(`\n📝 查询: ${query}`);
    console.log('-' .repeat(40));
    
    const fullResult = await enhancedMemorySearch(query, {
      mode: 'full',
      limit: 2
    });
    
    console.log('原始模式结果结构:');
    console.log(fullResult);
    console.log('');
    
    if (fullResult) {
      console.log('结果属性:');
      console.log('  typeof:', typeof fullResult);
      console.log('  has results:', 'results' in fullResult);
      console.log('  has count:', 'count' in fullResult);
      console.log('  has totalTokens:', 'totalTokens' in fullResult);
      
      if (fullResult.results) {
        console.log('  results:', Array.isArray(fullResult.results));
        console.log('  results length:', fullResult.results.length);
      }
    }
    
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('✨ **调试完成**');
}

debugSearchResult().catch(error => {
  console.error('❌ 错误:', error);
  console.error('Stack:', error.stack);
});