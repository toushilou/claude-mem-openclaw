/**
 * Enhanced Memory Search Wrapper
 * 为OpenClaw memory_search添加分层搜索功能
 * 基于claude-mem理念的渐进式增强
 */

const fs = require('fs');
const path = require('path');

/**
 * 配置
 */
const CONFIG = {
  // 搜索模式
  MODES: {
    INDEX: 'index',      // 仅索引：ID、标题、简短摘要 (~50-100 tokens)
    COMPACT: 'compact',  // 紧凑：ID、标题、中等摘要 (~100-200 tokens)
    FULL: 'full',        // 完整：原始memory_search结果 (~500-1000+ tokens)
    AUTO: 'auto'         // 自动：根据context自动选择
  },
  
  // Token估算（每字符约0.5-1个token，中文取中间值）
  TOKEN_ESTIMATES: {
    INDEX_PER_CHAR: 0.3,      // 索引模式每字符tokens
    COMPACT_PER_CHAR: 0.4,    // 紧凑模式每字符tokens
    SUMMARY_MAX_LENGTH: 150,  // 摘要最大长度
    TITLE_MAX_LENGTH: 80      // 标题最大长度
  },
  
  // 自动模式选择逻辑
  AUTO_MODE_RULES: {
    HEARTBEAT_QUERIES: ['检查', 'heartbeat', '状态', '更新', 'review'],
    DETAILED_QUERIES: ['详细', '完整', '全部', 'complete', 'full'],
    DEFAULT_MODE: 'compact'
  }
};

/**
 * 主函数：增强版memory_search
 * @param {string} query - 搜索查询
 * @param {object} options - 选项
 * @param {string} options.mode - 搜索模式: 'index' | 'compact' | 'full' | 'auto'
 * @param {number} options.limit - 结果限制
 * @param {number} options.minScore - 最低分数
 * @param {boolean} options.json - 是否返回JSON
 * @returns {Promise<Array>} 搜索结果
 */
async function enhancedMemorySearch(query, options = {}) {
  const {
    mode = CONFIG.MODES.AUTO,
    limit = 10,
    minScore = 0.3,
    json = false
  } = options;
  
  console.log(`🔍 Enhanced Memory Search: "${query}"`);
  console.log(`   模式: ${mode}, 限制: ${limit}, 最小分数: ${minScore}`);
  
  try {
    // 1. 确定实际使用的模式
    const actualMode = determineSearchMode(query, mode);
    console.log(`   实际模式: ${actualMode}`);
    
    // 2. 智能选择搜索策略
    let rawResults;
    const searchOptions = {
      maxResults: actualMode === CONFIG.MODES.FULL ? limit : limit * 2,
      minScore
    };
    
    // 根据模式选择搜索策略
    switch (actualMode) {
      case CONFIG.MODES.INDEX:
      case CONFIG.MODES.COMPACT:
        // index和compact模式：优先使用摘要库（更快，更节省token）
        searchOptions.useSummaryLibrary = true;
        break;
        
      case CONFIG.MODES.FULL:
        // full模式：使用原始文件搜索（获取完整内容）
        searchOptions.useSummaryLibrary = false;
        break;
    }
    
    // 执行搜索
    rawResults = await simulateMemorySearch(query, searchOptions);
    
    // 确保返回格式一致性
    if (!rawResults || !Array.isArray(rawResults) || rawResults.length === 0) {
      console.log('   没有找到结果');
      return json ? {
        query,
        mode: actualMode,
        count: 0,
        totalTokens: 0,
        results: [],
        timestamp: new Date().toISOString()
      } : '没有找到相关记忆';
    }
    
    // 3. 根据模式格式化结果
    let formattedResults;
    let totalTokens = 0;
    
    switch (actualMode) {
      case CONFIG.MODES.INDEX:
        formattedResults = formatIndexResults(rawResults.slice(0, limit));
        totalTokens = estimateTokens(formattedResults, CONFIG.MODES.INDEX);
        break;
        
      case CONFIG.MODES.COMPACT:
        formattedResults = formatCompactResults(rawResults.slice(0, limit));
        totalTokens = estimateTokens(formattedResults, CONFIG.MODES.COMPACT);
        break;
        
      case CONFIG.MODES.FULL:
        formattedResults = rawResults.slice(0, limit);
        totalTokens = estimateTokens(formattedResults, CONFIG.MODES.FULL);
        break;
    }
    
    // 4. 添加元数据
    const response = {
      query,
      mode: actualMode,
      count: formattedResults.length,
      totalTokens,
      results: formattedResults,
      timestamp: new Date().toISOString()
    };
    
    console.log(`   找到 ${formattedResults.length} 个结果`);
    console.log(`   预计token使用: ~${totalTokens}`);
    
    if (actualMode !== CONFIG.MODES.FULL) {
      const fullModeTokens = estimateTokens(rawResults.slice(0, limit), CONFIG.MODES.FULL);
      const savings = fullModeTokens - totalTokens;
      const savingsPercent = Math.round(savings / fullModeTokens * 100);
      console.log(`   💰 节省: ${savings} tokens (${savingsPercent}%)`);
    }
    
    return json ? response : formatHumanReadable(response);
    
  } catch (error) {
    console.error('❌ Enhanced Memory Search错误:', error);
    return json ? { error: error.message } : `搜索错误: ${error.message}`;
  }
}

/**
 * 确定搜索模式
 */
function determineSearchMode(query, requestedMode) {
  if (requestedMode !== CONFIG.MODES.AUTO) {
    return requestedMode;
  }
  
  // 自动模式选择逻辑
  const queryLower = query.toLowerCase();
  
  // 如果是心跳检查类的查询
  for (const keyword of CONFIG.AUTO_MODE_RULES.HEARTBEAT_QUERIES) {
    if (queryLower.includes(keyword.toLowerCase())) {
      return CONFIG.MODES.COMPACT;
    }
  }
  
  // 如果是详细查询
  for (const keyword of CONFIG.AUTO_MODE_RULES.DETAILED_QUERIES) {
    if (queryLower.includes(keyword.toLowerCase())) {
      return CONFIG.MODES.FULL;
    }
  }
  
  // 默认使用紧凑模式（在token节省和结果质量间平衡）
  return CONFIG.MODES.AUTO_MODE_RULES.DEFAULT_MODE;
}

/**
 * 格式化索引结果（Layer 1）
 */
function formatIndexResults(results) {
  return results.map(item => ({
    id: item.id || generateId(item),
    title: truncate(item.title || extractTitle(item.content), CONFIG.TOKEN_ESTIMATES.TITLE_MAX_LENGTH),
    path: item.path,
    score: item.score,
    timestamp: item.timestamp || new Date().toISOString(),
    snippet: truncate(generateSnippet(item.content), 50)
  }));
}

/**
 * 格式化紧凑结果（Layer 2）
 */
function formatCompactResults(results) {
  return results.map(item => ({
    id: item.id || generateId(item),
    title: truncate(item.title || extractTitle(item.content), CONFIG.TOKEN_ESTIMATES.TITLE_MAX_LENGTH),
    path: item.path,
    score: item.score,
    timestamp: item.timestamp || new Date().toISOString(),
    summary: generateSummary(item.content, CONFIG.TOKEN_ESTIMATES.SUMMARY_MAX_LENGTH),
    keywords: extractKeywords(item.content).slice(0, 5),
    relevance: getRelevanceDescription(item.score)
  }));
}

/**
 * 生成摘要（简化版）
 */
function generateSummary(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || '无内容';
  }
  
  // 1. 尝试使用第一段
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length <= maxLength) {
      return firstLine;
    }
  }
  
  // 2. 智能截断：在句子边界处截断
  const sentences = text.split(/[。.!！?？]/);
  let summary = '';
  for (const sentence of sentences) {
    if (summary.length + sentence.length + 1 <= maxLength) {
      summary += sentence + '。';
    } else {
      break;
    }
  }
  
  if (summary.length > 0) {
    return summary + '...';
  }
  
  // 3. 简单截断
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 生成简短片段
 */
function generateSnippet(text) {
  const sentences = text.split(/[。.!！?？]/);
  return sentences[0] ? truncate(sentences[0], 50) : truncate(text, 50);
}

/**
 * 提取关键词（简化版）
 */
function extractKeywords(text) {
  if (!text) return [];
  
  const commonWords = ['的', '了', '在', '是', '有', '和', '与', '等', '这个', '一个', '一些', '可以', '需要', '应该'];
  const words = text.split(/[\s\.,，。!！?？;；:：]+/);
  
  const wordCount = {};
  words.forEach(word => {
    const cleanWord = word.trim();
    if (cleanWord.length > 1 && !commonWords.includes(cleanWord)) {
      wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
    }
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * 提取标题
 */
function extractTitle(content) {
  if (!content) return '无标题';
  
  // 查找第一个标题
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // 查找第一个非空行
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  if (lines.length > 0) {
    return truncate(lines[0], CONFIG.TOKEN_ESTIMATES.TITLE_MAX_LENGTH);
  }
  
  return '无标题';
}

/**
 * 生成ID
 */
function generateId(item) {
  return `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 截断文本
 */
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * 相关性描述
 */
function getRelevanceDescription(score) {
  if (score >= 0.8) return '高度相关';
  if (score >= 0.6) return '相关';
  if (score >= 0.4) return '中等相关';
  return '低相关';
}

/**
 * 优化的token估算函数 - 更精确的计算
 */
function estimateTokens(results, mode) {
  if (!results || results.length === 0) return 0;
  
  let totalChars = 0;
  
  // 优化：只计算关键字段的字符数，忽略元数据
  const keyFields = ['title', 'content', 'summary', 'keywords', 'snippet'];
  
  results.forEach(item => {
    keyFields.forEach(field => {
      const value = item[field];
      if (typeof value === 'string') {
        totalChars += value.length;
      } else if (Array.isArray(value)) {
        value.forEach(v => {
          if (typeof v === 'string') totalChars += v.length;
        });
      }
    });
  });
  
  // 优化系数：根据实际测试调整
  const factor = mode === CONFIG.MODES.INDEX 
    ? 0.25 // 索引模式更精简
    : mode === CONFIG.MODES.COMPACT
    ? 0.35 // 紧凑模式优化
    : 0.6; // full模式优化
  
  const estimated = Math.ceil(totalChars * factor);
  
  // 添加查询和响应的基础token开销
  return estimated + 50; // 固定开销
}

// 导入摘要生成器
const SummaryGenerator = require('./summary_generator.js');
let summaryGeneratorInstance = null;

/**
 * 获取摘要生成器实例（单例模式）
 */
function getSummaryGenerator() {
  if (!summaryGeneratorInstance) {
    summaryGeneratorInstance = new SummaryGenerator({
      memoryDir: path.join(process.env.HOME || '/home/yuanquan', '.openclaw/workspace/memory'),
      summaryDir: path.join(process.env.HOME || '/home/yuanquan', '.openclaw/workspace/memory/summaries'),
      summaryDb: path.join(process.env.HOME || '/home/yuanquan', '.openclaw/workspace/memory/summaries.json')
    });
  }
  return summaryGeneratorInstance;
}

/**
 * 安全地销毁摘要生成器实例（防止内存泄漏）
 */
function disposeSummaryGenerator() {
  if (summaryGeneratorInstance) {
    summaryGeneratorInstance = null;
  }
}

/**
 * 模拟memory_search（增强版：使用摘要库）
 * 支持两种模式：从原始文件搜索 或 从摘要库搜索
 */
async function simulateMemorySearch(query, options = {}) {
  const useSummaryLibrary = options.useSummaryLibrary !== false;
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, useSummaryLibrary ? 30 : 100));
  
  if (useSummaryLibrary) {
    // 模式1：从摘要库搜索（更快，更节省token）
    return searchFromSummaryLibrary(query, options);
  } else {
    // 模式2：从原始文件搜索（完整内容，较慢）
    return searchFromOriginalFiles(query, options);
  }
}

/**
 * 从摘要库搜索
 */
async function searchFromSummaryLibrary(query, options) {
  try {
    const generator = getSummaryGenerator();
    const searchResults = generator.searchSummaries(query, {
      limit: options.maxResults * 2
    });
    
    const results = searchResults.results.map(item => {
      const score = item.score || 0.5;
      const filePath = item.path;
      
      try {
        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        return {
          id: `summary-${item.hash || item.filename}`,
          title: item.title || '无标题',
          path: filePath,
          content: item.summary || '无摘要',
          score: score,
          timestamp: stats ? stats.mtime.toISOString() : new Date().toISOString(),
          summary: item.summary,
          keywords: item.keywords,
          source: 'summary_library'
        };
      } catch (err) {
        return null;
      }
    }).filter(item => item !== null);
    
    return results.sort((a, b) => b.score - a.score).slice(0, options.maxResults);
    
  } catch (error) {
    console.warn('⚠️ 摘要库搜索失败，回退到原始文件搜索:', error.message);
    return searchFromOriginalFiles(query, options);
  }
}

/**
 * 从原始文件搜索（原逻辑）
 */
async function searchFromOriginalFiles(query, options) {
  // 从真实的memory文件读取数据
  const memoryDir = path.join(process.env.HOME || '/home/yuanquan', '.openclaw/workspace/memory');
  const files = fs.existsSync(memoryDir) 
    ? fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'))
    : [];
  
  const results = [];
  const queryLower = query.toLowerCase();
  
  for (const file of files.slice(0, options.maxResults * 2)) {
    try {
      const filePath = path.join(memoryDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 简单内容匹配
      const contentLower = content.toLowerCase();
      if (contentLower.includes(queryLower)) {
        const matchCount = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
        const score = Math.min(0.3 + matchCount * 0.1, 0.9);
        
        results.push({
          id: `file-${file.replace('.md', '')}`,
          title: extractTitle(content),
          path: filePath,
          content: content,
          score: score,
          timestamp: fs.statSync(filePath).mtime.toISOString(),
          source: 'original_files'
        });
      }
    } catch (err) {
      // 忽略读取错误
    }
  }
  
  // 按分数排序
  return results.sort((a, b) => b.score - a.score).slice(0, options.maxResults);
}

/**
 * 格式化为人可读的输出
 */
function formatHumanReadable(response) {
  let output = `🔍 搜索 "${response.query}" (${response.mode}模式)\n`;
  output += `找到 ${response.count} 个结果，预计使用 ~${response.totalTokens} tokens\n\n`;
  
  response.results.forEach((result, index) => {
    output += `${index + 1}. ${result.title}\n`;
    
    if (response.mode === CONFIG.MODES.INDEX) {
      output += `   摘要: ${result.snippet}\n`;
    } else if (response.mode === CONFIG.MODES.COMPACT) {
      output += `   摘要: ${result.summary}\n`;
      if (result.keywords && result.keywords.length > 0) {
        output += `   关键词: ${result.keywords.join(', ')}\n`;
      }
    }
    
    output += `   路径: ${result.path}\n`;
    output += `   分数: ${result.score.toFixed(2)} (${result.relevance || getRelevanceDescription(result.score)})\n`;
    output += `   时间: ${new Date(result.timestamp).toLocaleString('zh-CN')}\n`;
    
    if (index < response.results.length - 1) {
      output += '\n';
    }
  });
  
  return output;
}

/**
 * CLI接口
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: node enhanced_memory_search.js <查询> [--mode=<index|compact|full|auto>] [--limit=<数字>] [--json]');
    console.log('示例: node enhanced_memory_search.js "claude-mem" --mode=compact --limit=5');
    process.exit(1);
  }
  
  const query = args[0];
  const options = {};
  
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--json')) {
      options.json = true;
    }
  });
  
  enhancedMemorySearch(query, options)
    .then(result => {
      console.log(result);
    })
    .catch(error => {
      console.error('❌ 错误:', error);
      process.exit(1);
    });
}

module.exports = {
  enhancedMemorySearch,
  CONFIG
};