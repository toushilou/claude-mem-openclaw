/**
 * 每日摘要生成器 - 方案B核心组件
 * 自动为memory文件生成和管理的智能摘要库
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SummaryGenerator {
  constructor(options = {}) {
    // 配置
    this.config = {
      memoryDir: options.memoryDir || path.join(process.env.HOME || '.', '.openclaw/workspace/memory'),
      summaryDir: options.summaryDir || path.join(process.env.HOME || '.', '.openclaw/workspace/memory/summaries'),
      summaryDb: options.summaryDb || path.join(process.env.HOME || '.', '.openclaw/workspace/memory/summaries.json'),
      maxSummaryLength: options.maxSummaryLength || 200,
      keywordsPerFile: options.keywordsPerFile || 5,
      keepOriginalStructure: options.keepOriginalStructure !== false,
      updateInterval: options.updateInterval || 24 * 60 * 60 * 1000 // 24小时
    };
    
    // 建立目录
    this.ensureDirectories();
    
    console.log('📚 摘要生成器初始化完成');
    console.log(`   内存目录: ${this.config.memoryDir}`);
    console.log(`   摘要目录: ${this.config.summaryDir}`);
    console.log(`   数据库: ${this.config.summaryDb}`);
  }
  
  /**
   * 确保目录存在
   */
  ensureDirectories() {
    if (!fs.existsSync(this.config.memoryDir)) {
      fs.mkdirSync(this.config.memoryDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.config.summaryDir)) {
      fs.mkdirSync(this.config.summaryDir, { recursive: true });
    }
  }
  
  /**
   * 生成文件内容哈希（用于检测变化）
   */
  generateFileHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * 智能提取摘要
   */
  extractSummary(content, filePath) {
    if (!content || content.trim().length === 0) {
      return { summary: '空文件', keywords: [] };
    }
    
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { summary: '空文件', keywords: [] };
    }
    
    // 1. 尝试提取标题
    let title = '无标题';
    const titleMatch = content.match(/^# (.+)$/m);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else if (lines.length > 0) {
      title = lines[0].substring(0, this.config.maxSummaryLength / 2);
    }
    
    // 2. 提取关键段落
    const keyParagraphs = this.extractKeyParagraphs(lines);
    
    // 3. 生成摘要
    let summary;
    if (keyParagraphs.length > 0) {
      // 组合关键段落
      summary = keyParagraphs.join(' | ');
      if (summary.length > this.config.maxSummaryLength) {
        summary = summary.substring(0, this.config.maxSummaryLength - 3) + '...';
      }
    } else {
      // 简单摘要
      const firstLine = lines[0];
      summary = firstLine.length > this.config.maxSummaryLength
        ? firstLine.substring(0, this.config.maxSummaryLength - 3) + '...'
        : firstLine;
    }
    
    // 4. 提取关键词
    const keywords = this.extractKeywords(content);
    
    // 5. 提取日期（尝试从文件名或内容中提取）
    const dateInfo = this.extractDateInfo(content, filePath);
    
    return {
      title,
      summary,
      keywords: keywords.slice(0, this.config.keywordsPerFile),
      date: dateInfo,
      length: content.length,
      lines: lines.length,
      createdAt: new Date().toISOString(),
      hash: this.generateFileHash(content)
    };
  }
  
  /**
   * 提取关键段落
   */
  extractKeyParagraphs(lines) {
    const keyParagraphs = [];
    
    // 优先级：标题行、带标记的行（##、###）、较长的段落
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].trim();
      
      // 跳过空行
      if (line.length === 0) continue;
      
      // 检测是否是重要行
      const isImportant = 
        line.startsWith('# ') || 
        line.startsWith('## ') || 
        line.startsWith('### ') ||
        line.startsWith('#### ') ||
        line.includes('✅') || 
        line.includes('❌') ||
        line.includes('⚠️') ||
        line.match(/^\d+\.\s+/); // 数字列表
        
      if (isImportant && line.length > 10 && line.length < 100) {
        keyParagraphs.push(line);
        
        // 限制关键段落数量
        if (keyParagraphs.length >= 3) break;
      }
    }
    
    // 如果没有找到重要行，取前2个非空行
    if (keyParagraphs.length === 0 && lines.length >= 2) {
      for (let i = 0; i < Math.min(lines.length, 2); i++) {
        if (lines[i].trim().length > 10) {
          keyParagraphs.push(lines[i].trim());
        }
      }
    }
    
    return keyParagraphs;
  }
  
  /**
   * 提取关键词（简化版）
   */
  extractKeywords(content) {
    const commonWords = ['的', '了', '在', '是', '有', '和', '与', '等', '这个', '一个', '一些'];
    const words = content.split(/[\s\.,，。!！?？;；:：]+/);
    
    const wordCount = {};
    words.forEach(word => {
      const cleanWord = word.trim();
      if (cleanWord.length > 1 && !commonWords.includes(cleanWord)) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }
  
  /**
   * 提取日期信息
   */
  extractDateInfo(content, filePath) {
    // 1. 尝试从文件名提取
    const fileName = path.basename(filePath);
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      return dateMatch[1];
    }
    
    // 2. 尝试从内容提取
    const datePatterns = [
      /(\d{4}[年./-]\d{1,2}[月./-]\d{1,2}日?)/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}:\d{2})/ // 时间
    ];
    
    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return '无日期信息';
  }
  
  /**
   * 处理单个文件
   */
  processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);
      const summary = this.extractSummary(content, filePath);
      
      const fileInfo = {
        path: filePath,
        filename: path.basename(filePath),
        summary,
        fileStats: {
          size: content.length,
          modified: stats.mtime,
          created: stats.ctime
        },
        processedAt: new Date().toISOString()
      };
      
      // 保存摘要文件
      const summaryFileName = `${path.basename(filePath, '.md')}-summary.json`;
      const summaryPath = path.join(this.config.summaryDir, summaryFileName);
      fs.writeFileSync(summaryPath, JSON.stringify(fileInfo, null, 2));
      
      return fileInfo;
      
    } catch (error) {
      console.error(`❌ 处理文件失败 ${filePath}:`, error.message);
      return null;
    }
  }
  
  /**
   * 扫描并处理所有文件
   */
  scanAndProcessAll() {
    console.log('🔍 开始扫描内存文件...');
    
    if (!fs.existsSync(this.config.memoryDir)) {
      console.log('❌ 内存目录不存在:', this.config.memoryDir);
      return [];
    }
    
    const files = fs.readdirSync(this.config.memoryDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(this.config.memoryDir, file));
    
    console.log(`   找到 ${files.length} 个.md文件`);
    
    const results = [];
    for (const file of files) {
      const result = this.processFile(file);
      if (result) {
        results.push(result);
        console.log(`   ✅ ${path.basename(file)} - 摘要生成成功`);
      }
    }
    
    // 更新数据库
    this.updateSummaryDatabase(results);
    
    console.log(`🎯 摘要生成完成: ${results.length}/${files.length} 个文件`);
    return results;
  }
  
  /**
   * 更新摘要数据库
   */
  updateSummaryDatabase(results) {
    const dbData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalFiles: results.length,
      summaries: results.map(r => ({
        filename: r.filename,
        path: r.path,
        title: r.summary.title,
        summary: r.summary.summary,
        keywords: r.summary.keywords,
        date: r.summary.date,
        length: r.summary.length,
        hash: r.summary.hash,
        processedAt: r.processedAt
      }))
    };
    
    fs.writeFileSync(this.config.summaryDb, JSON.stringify(dbData, null, 2));
    console.log(`💾 数据库更新: ${this.config.summaryDb}`);
  }
  
  /**
   * 加载摘要数据库
   */
  loadSummaryDatabase() {
    try {
      if (!fs.existsSync(this.config.summaryDb)) {
        console.log('📋 摘要数据库不存在，需要重新生成');
        return { summaries: [] };
      }
      
      const data = fs.readFileSync(this.config.summaryDb, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ 加载数据库失败:', error.message);
      return { summaries: [] };
    }
  }
  
  /**
   * 搜索摘要库
   */
  searchSummaries(query, options = {}) {
    const db = this.loadSummaryDatabase();
    const queryLower = query.toLowerCase();
    
    const results = db.summaries.filter(item => {
      // 多字段搜索
      const searchText = [
        item.title || '',
        item.summary || '',
        (item.keywords || []).join(' '),
        item.filename || ''
      ].join(' ').toLowerCase();
      
      return searchText.includes(queryLower);
    }).map(item => ({
      ...item,
      score: this.calculateRelevanceScore(item, queryLower)
    })).sort((a, b) => b.score - a.score);
    
    // 应用限制
    const limit = options.limit || 10;
    const limitedResults = results.slice(0, limit);
    
    return {
      query,
      count: limitedResults.length,
      totalMatches: results.length,
      results: limitedResults,
      searchTime: new Date().toISOString()
    };
  }
  
  /**
   * 计算相关性分数
   */
  calculateRelevanceScore(item, query) {
    let score = 0;
    
    // 标题匹配权重最高
    if (item.title && item.title.toLowerCase().includes(query)) {
      score += 30;
    }
    
    // 摘要匹配
    if (item.summary && item.summary.toLowerCase().includes(query)) {
      score += 10;
    }
    
    // 关键词匹配
    if (item.keywords) {
      const keywordMatches = item.keywords.filter(kw => 
        kw.toLowerCase().includes(query)
      ).length;
      score += keywordMatches * 5;
    }
    
    // 文件名匹配
    if (item.filename && item.filename.toLowerCase().includes(query)) {
      score += 15;
    }
    
    return Math.min(score / 50, 1.0);
  }
  
  /**
   * CLI接口
   */
  runCLI() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('📚 每日摘要生成器 - 使用说明');
      console.log('用法:');
      console.log('  node summary_generator.js scan         # 扫描并生成所有摘要');
      console.log('  node summary_generator.js search <查询> # 搜索摘要库');
      console.log('  node summary_generator.js stats        # 显示统计信息');
      console.log('  node summary_generator.js clean        # 清除所有摘要文件');
      process.exit(1);
    }
    
    const command = args[0];
    
    switch (command) {
      case 'scan':
        console.log('🔍 开始扫描并生成摘要...');
        this.scanAndProcessAll();
        break;
        
      case 'search':
        if (args.length < 2) {
          console.log('❌ 需要提供搜索查询');
          process.exit(1);
        }
        const query = args.slice(1).join(' ');
        console.log(`🔍 搜索摘要库: "${query}"`);
        const searchResults = this.searchSummaries(query, { limit: 5 });
        
        console.log(`\n找到 ${searchResults.count} 个匹配 (共 ${searchResults.totalMatches} 个)`);
        searchResults.results.forEach((result, i) => {
          console.log(`\n${i + 1}. ${result.title}`);
          console.log(`   摘要: ${result.summary}`);
          console.log(`   关键词: ${result.keywords.join(', ')}`);
          console.log(`   文件: ${result.filename}, 分数: ${result.score.toFixed(2)}`);
        });
        break;
        
      case 'stats':
        const db = this.loadSummaryDatabase();
        console.log('📊 摘要库统计信息:');
        console.log(`   总文件数: ${db.totalFiles || 0}`);
        console.log(`   生成时间: ${db.generatedAt || '未生成'}`);
        console.log(`   版本: ${db.version || '未知'}`);
        
        // 摘要目录文件数
        if (fs.existsSync(this.config.summaryDir)) {
          const summaryFiles = fs.readdirSync(this.config.summaryDir)
            .filter(f => f.endsWith('.json')).length;
          console.log(`   摘要文件数: ${summaryFiles}`);
        }
        break;
        
      case 'clean':
        console.log('🗑️ 清除所有摘要文件...');
        if (fs.existsSync(this.config.summaryDir)) {
          const files = fs.readdirSync(this.config.summaryDir);
          files.forEach(file => {
            fs.unlinkSync(path.join(this.config.summaryDir, file));
          });
        }
        if (fs.existsSync(this.config.summaryDb)) {
          fs.unlinkSync(this.config.summaryDb);
        }
        console.log('✅ 清理完成');
        break;
        
      default:
        console.log(`❌ 未知命令: ${command}`);
        process.exit(1);
    }
  }
}

// 导出模块
module.exports = SummaryGenerator;

// CLI执行
if (require.main === module) {
  const generator = new SummaryGenerator();
  generator.runCLI();
}