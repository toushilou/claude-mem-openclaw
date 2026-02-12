/**
 * 统一的内存系统接口
 * 集成方案A（分层搜索）和方案B（摘要库）
 * 为OpenClaw提供完整的claude-mem风格记忆压缩系统
 */

const { enhancedMemorySearch } = require('./enhanced_memory_search.js');
const SummaryGenerator = require('./summary_generator.js');

class MemorySystem {
  constructor(options = {}) {
    // 配置
    this.config = {
      autoUpdateSummaries: options.autoUpdateSummaries !== false,
      updateInterval: options.updateInterval || 24 * 60 * 60 * 1000, // 24小时
      defaultSearchMode: options.defaultSearchMode || 'auto',
      useSummaryLibrary: options.useSummaryLibrary !== false
    };
    
    // 初始化组件
    this.searchEngine = enhancedMemorySearch;
    this.summaryGenerator = new SummaryGenerator();
    
    // 状态
    this.lastSummaryUpdate = null;
    this.isInitialized = false;
    
    console.log('🧠 分层记忆系统初始化完成');
    console.log('   组件: 增强搜索引擎 + 摘要库系统');
    console.log('   模式: claude-mem风格分层压缩');
  }
  
  /**
   * 初始化系统
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔧 初始化记忆系统...');
    
    try {
      // 1. 确保摘要库存在且最新
      if (this.config.autoUpdateSummaries) {
        await this.updateSummariesIfNeeded();
      }
      
      this.isInitialized = true;
      console.log('✅ 记忆系统初始化完成');
      
    } catch (error) {
      console.error('❌ 记忆系统初始化失败:', error.message);
      // 即使初始化失败，系统仍然可以工作（使用回退模式）
    }
  }
  
  /**
   * 检查并更新摘要库
   */
  async updateSummariesIfNeeded() {
    const db = this.summaryGenerator.loadSummaryDatabase();
    
    if (!db.generatedAt) {
      console.log('📚 首次运行，生成摘要库...');
      await this.updateSummaries();
      return;
    }
    
    const lastUpdate = new Date(db.generatedAt);
    const now = new Date();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) { // 超过24小时，需要更新
      console.log(`🔄 摘要库已存在${hoursSinceUpdate.toFixed(1)}小时，需要更新...`);
      await this.updateSummaries();
    } else {
      console.log(`📊 摘要库状态良好，上次更新: ${hoursSinceUpdate.toFixed(1)}小时前`);
    }
  }
  
  /**
   * 更新摘要库
   */
  async updateSummaries() {
    try {
      console.log('🔄 更新摘要库...');
      this.summaryGenerator.scanAndProcessAll();
      this.lastSummaryUpdate = new Date().toISOString();
      console.log('✅ 摘要库更新完成');
    } catch (error) {
      console.error('❌ 摘要库更新失败:', error.message);
      throw error;
    }
  }
  
  /**
   * 主搜索接口
   */
  async search(query, options = {}) {
    // 确保系统已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // 合并选项
    const searchOptions = {
      mode: options.mode || this.config.defaultSearchMode,
      limit: options.limit || 10,
      minScore: options.minScore || 0.3,
      json: options.json !== false, // 默认返回JSON格式
      ...options
    };
    
    console.log(`🔍 记忆系统搜索: "${query}"`);
    console.log(`   模式: ${searchOptions.mode}, 限制: ${searchOptions.limit}`);
    
    // 调用增强搜索引擎
    return await enhancedMemorySearch(query, searchOptions);
  }
  
  /**
   * 分层搜索工作流（claude-mem风格）- 优化版
   */
  async layeredSearch(query, options = {}) {
    const workflow = {
      stage1: null, // 索引层
      stage2: null, // 紧凑层
      stage3: null, // 详细层
      selectedIds: [],
      totalTokens: 0,
      savedTokens: 0,
      executionTime: {}
    };
    
    const startTime = Date.now();
    console.log(`🚀 分层搜索工作流启动: "${query}"\n`);
    
    // 阶段1：索引搜索
    console.log('📋 阶段1: 索引搜索');
    const stage1Start = Date.now();
    workflow.stage1 = await this.search(query, {
      mode: 'index',
      limit: options.limit || 8, // 减少初始结果数量
      json: true
    });
    workflow.executionTime.stage1 = Date.now() - stage1Start;
    
    if (workflow.stage1.count === 0) {
      console.log('❌ 索引搜索无结果，工作流结束');
      workflow.executionTime.total = Date.now() - startTime;
      return workflow;
    }
    
    console.log(`   找到 ${workflow.stage1.count} 个索引结果，使用 ~${workflow.stage1.totalTokens} tokens\n`);
    workflow.totalTokens += workflow.stage1.totalTokens;
    
    // 阶段2：紧凑搜索（获取摘要）- 优化策略
    console.log('📋 阶段2: 紧凑搜索（获取摘要）');
    const stage2Start = Date.now();
    
    // 智能选择要获取摘要的结果（前2-3个）
    if (!workflow.stage1.results || workflow.stage1.results.length === 0) {
      console.log('❌ 索引搜索结果格式错误，工作流结束');
      workflow.executionTime.total = Date.now() - startTime;
      return workflow;
    }
    
    const idsToGetDetails = workflow.stage1.results
      .slice(0, Math.min(2, workflow.stage1.results.length)) // 减少摘要获取数量
      .map(item => item.id);
    
    workflow.selectedIds = idsToGetDetails;
    console.log(`   选择获取摘要的ID: ${idsToGetDetails.join(', ')}`);
    
    // 优化：直接使用摘要库获取结果，避免重复搜索
    const SummaryGenerator = require('./summary_generator');
    const generator = new SummaryGenerator();
    const compactResults = [];
    
    for (const id of idsToGetDetails) {
      // 从摘要库查找匹配内容
      const searchResult = generator.searchSummaries(query, { limit: 1 });
      if (searchResult && searchResult.results && searchResult.results.length > 0) {
        compactResults.push(searchResult.results[0]);
      }
    }
    
    workflow.stage2 = compactResults;
    workflow.executionTime.stage2 = Date.now() - stage2Start;
    
    // 估算阶段2的token使用
    const compactTokens = compactResults.length * 120; // 每个摘要约120 tokens（进一步优化）
    workflow.totalTokens += compactTokens;
    console.log(`   获取摘要完成，使用 ~${compactTokens} tokens\n`);
    
    // 阶段3：详细搜索（如果需要）
    if (options.includeFullDetails && idsToGetDetails.length > 0) {
      console.log('📋 阶段3: 详细搜索（获取完整内容）');
      
      const fullPromises = idsToGetDetails.map(id => {
        return this.search(query, {
          mode: 'full',
          limit: 1,
          json: true
        });
      });
      
      const fullResults = await Promise.all(fullPromises);
      workflow.stage3 = fullResults.flatMap(r => r.results);
      
      const fullTokens = fullResults.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
      console.log(`   获取完整内容完成，使用 ~${fullTokens} tokens\n`);
      
      workflow.totalTokens = workflow.stage1.totalTokens + compactTokens + fullTokens;
      
      // 计算节省
      const directFullSearch = await this.search(query, {
        mode: 'full',
        limit: idsToGetDetails.length,
        json: true
      });
      
      const directTokens = directFullSearch.totalTokens || 0;
      workflow.savedTokens = directTokens - workflow.totalTokens;
      
      console.log(`💰 Token节省: ${workflow.savedTokens} tokens (${Math.round(workflow.savedTokens/directTokens*100)}%)`);
    } else {
      workflow.totalTokens = workflow.stage1.totalTokens + compactTokens;
    }
    
    console.log('✅ 分层搜索工作流完成');
    return workflow;
  }
  
  /**
   * 心跳检查优化版
   */
  async heartbeatCheck(query = '检查近期活动和更新', options = {}) {
    console.log('🫀 心跳检查优化版启动...\n');
    
    const startTime = Date.now();
    
    // 使用紧凑模式进行心跳检查（最优平衡）
    const result = await this.search(query, {
      mode: 'compact',
      limit: options.limit || 15,
      minScore: 0.2, // 心跳检查降低门槛
      json: true
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📊 心跳检查完成:`);
    console.log(`   查询: "${query}"`);
    console.log(`   找到: ${result.count} 个相关项目`);
    console.log(`   Token使用: ~${result.totalTokens}`);
    console.log(`   耗时: ${duration}ms\n`);
    
    // 与传统方法对比
    const traditionalEstimate = 3000; // 传统方法约3000 tokens
    const savings = traditionalEstimate - result.totalTokens;
    const savingsPercent = Math.round(savings / traditionalEstimate * 100);
    
    console.log(`💰 与传统方法对比:`);
    console.log(`   传统方法: ~${traditionalEstimate} tokens`);
    console.log(`   优化方法: ~${result.totalTokens} tokens`);
    console.log(`   🔥 节省: ${savings} tokens (${savingsPercent}%)\n`);
    
    return {
      ...result,
      metadata: {
        duration,
        savings,
        savingsPercent,
        traditionalEstimate,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  /**
   * 系统状态报告
   */
  getStatus() {
    const db = this.summaryGenerator.loadSummaryDatabase();
    
    return {
      system: '分层记忆压缩系统',
      version: '1.0.0',
      initialized: this.isInitialized,
      lastSummaryUpdate: db.generatedAt || '未生成',
      totalFiles: db.totalFiles || 0,
      config: this.config,
      components: {
        searchEngine: 'enhancedMemorySearch',
        summaryGenerator: 'SummaryGenerator',
        integration: '完整集成'
      }
    };
  }
  
  /**
   * CLI接口
   */
  async runCLI() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('🧠 分层记忆系统 - 使用说明');
      console.log('');
      console.log('使用方法:');
      console.log('  node memory_system.js search <查询> [--mode=<index|compact|full|auto>]');
      console.log('  node memory_system.js layered <查询>          # 分层搜索工作流');
      console.log('  node memory_system.js heartbeat              # 心跳检查模拟');
      console.log('  node memory_system.js status                 # 系统状态');
      console.log('  node memory_system.js update                 # 更新摘要库');
      console.log('');
      console.log('示例:');
      console.log('  node memory_system.js search "claude-mem" --mode=compact');
      console.log('  node memory_system.js layered "研究"');
      console.log('  node memory_system.js heartbeat');
      process.exit(1);
    }
    
    const command = args[0];
    
    // 初始化系统
    await this.initialize();
    
    switch (command) {
      case 'search':
        if (args.length < 2) {
          console.log('❌ 需要提供搜索查询');
          process.exit(1);
        }
        
        const query = args.slice(1).join(' ').replace(/--mode=.*$/, '');
        const modeMatch = args.find(arg => arg.startsWith('--mode='));
        const mode = modeMatch ? modeMatch.split('=')[1] : 'auto';
        
        const searchResult = await this.search(query, { mode, json: true });
        console.log(JSON.stringify(searchResult, null, 2));
        break;
        
      case 'layered':
        if (args.length < 2) {
          console.log('❌ 需要提供搜索查询');
          process.exit(1);
        }
        
        const layeredQuery = args.slice(1).join(' ');
        const layeredResult = await this.layeredSearch(layeredQuery, {
          includeFullDetails: true,
          limit: 5
        });
        
        console.log(JSON.stringify(layeredResult, null, 2));
        break;
        
      case 'heartbeat':
        const heartbeatResult = await this.heartbeatCheck();
        console.log(JSON.stringify(heartbeatResult, null, 2));
        break;
        
      case 'status':
        const status = this.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case 'update':
        console.log('🔄 手动更新摘要库...');
        await this.updateSummaries();
        console.log('✅ 摘要库更新完成');
        break;
        
      default:
        console.log(`❌ 未知命令: ${command}`);
        process.exit(1);
    }
  }
}

// 导出模块
module.exports = MemorySystem;

// 创建默认实例（单例模式）
let defaultInstance = null;

function getMemorySystem(options) {
  if (!defaultInstance) {
    defaultInstance = new MemorySystem(options);
  }
  return defaultInstance;
}

// CLI执行
if (require.main === module) {
  const system = getMemorySystem();
  system.runCLI().catch(console.error);
}

// 导出工具函数
module.exports.getMemorySystem = getMemorySystem;