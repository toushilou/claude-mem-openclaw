/**
 * 摘要库优化模块 - 短期优化1
 * 改进摘要生成算法，提高搜索覆盖率和质量
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnhancedSummaryGenerator {
  constructor(options = {}) {
    this.config = {
      summaryLength: 150,
      keywordsCount: 5,
      maxTitleLength: 60,
      minParagraphLength: 30,
      contentPriority: {
        headings: 3,
        lists: 2,
        highlighted: 2,
        tables: 1,
        text: 1
      },
      ...options
    };
    
    console.log('🚀 增强版摘要生成器初始化');
    console.log(`   配置: ${this.config.summaryLength}字符摘要, ${this.config.keywordsCount}个关键词`);
  }
  
  /**
   * 增强的内容分析
   */
  analyzeContent(content) {
    const analysis = {
      paragraphs: [],
      headings: [],
      lists: [],
      highlighted: [],
      tables: [],
      textBlocks: []
    };
    
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) return;
      
      // 分析内容类型
      if (trimmed.startsWith('#')) {
        analysis.headings.push({
          content: trimmed,
          index,
          level: this.getHeadingLevel(trimmed),
          score: this.config.contentPriority.headings
        });
      } else if (trimmed.match(/^[\d\*\+-]\s/)) {
        analysis.lists.push({
          content: trimmed,
          index,
          type: this.isOrderedList(trimmed),
          score: this.config.contentPriority.lists
        });
      } else if (trimmed.includes('**') || trimmed.includes('*') || trimmed.includes('`')) {
        analysis.highlighted.push({
          content: trimmed,
          index,
          highlights: this.extractHighlights(trimmed),
          score: this.config.contentPriority.highlighted
        });
      } else if (trimmed.includes('|')) {
        analysis.tables.push({
          content: trimmed,
          index,
          score: this.config.contentPriority.tables
        });
      } else if (trimmed.length > this.config.minParagraphLength) {
        analysis.textBlocks.push({
          content: trimmed,
          index,
          score: this.config.contentPriority.text
        });
      }
    });
    
    return analysis;
  }
  
  /**
   * 优化的摘要生成
   */
  extractEnhancedSummary(content) {
    const analysis = this.analyzeContent(content);
    
    // 1. 内容质量评估
    const quality = this.evaluateContentQuality(analysis);
    console.log(`📊 内容质量评估: ${quality.score}/10 - ${quality.description}`);
    
    // 2. 核心内容提取
    const keyElements = this.selectKeyElements(analysis);
    
    // 3. 摘要合成
    let summary = this.synthesizeSummary(keyElements);
    
    // 4. 长度控制
    if (summary.length > this.config.summaryLength) {
      summary = this.smartTruncate(summary);
    }
    
    // 5. 关键词提取优化
    const keywords = this.extractEnhancedKeywords(content, keyElements);
    
    return {
      summary,
      keywords: keywords.slice(0, this.config.keywordsCount),
      quality: quality.score,
      confidence: this.calculateConfidence(keyElements)
    };
  }
  
  /**
   * 智能截断算法
   */
  smartTruncate(text) {
    if (text.length <= this.config.summaryLength) {
      return text;
    }
    
    // 尝试在句子边界截断
    const sentenceEndings = ['.', '!', '?'];
    let truncationIndex = this.config.summaryLength;
    
    for (let i = this.config.summaryLength; i > 0; i--) {
      if (sentenceEndings.includes(text[i])) {
        truncationIndex = i + 1;
        break;
      }
    }
    
    // 如果没有找到句子边界，在词边界截断
    if (truncationIndex === this.config.summaryLength) {
      while (truncationIndex > 0 && ![' ', '\n', '\t'].includes(text[truncationIndex])) {
        truncationIndex--;
      }
    }
    
    return text.substring(0, truncationIndex) + '...';
  }
  
  /**
   * 评估内容质量
   */
  evaluateContentQuality(analysis) {
    let score = 0;
    let description = '';
    
    if (analysis.headings.length >= 2) {
      score += 3;
      description += '标题结构良好';
    }
    
    if (analysis.lists.length >= 3) {
      score += 2;
      description += (description ? ', ' : '') + '列表清晰';
    }
    
    if (analysis.highlighted.length >= 2) {
      score += 1;
      description += (description ? ', ' : '') + '重点突出';
    }
    
    const totalBlocks = Object.values(analysis).filter(v => Array.isArray(v)).flat().length;
    if (totalBlocks >= 5) {
      score += 2;
      description += (description ? ', ' : '') + '内容丰富';
    }
    
    if (!description) {
      description = '内容结构简单';
    }
    
    score = Math.min(score, 10);
    
    return { score, description };
  }
  
  /**
   * 智能选择内容元素
   */
  selectKeyElements(analysis) {
    const allElements = [];
    
    // 合并所有内容类型
    allElements.push(...analysis.headings);
    allElements.push(...analysis.lists);
    allElements.push(...analysis.highlighted);
    allElements.push(...analysis.tables);
    allElements.push(...analysis.textBlocks);
    
    // 根据分数和位置排序
    return allElements.sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      return a.index - b.index;
    }).slice(0, 6); // 限制元素数量
  }
  
  /**
   * 合成摘要
   */
  synthesizeSummary(keyElements) {
    const uniqueContent = new Set();
    const summaryLines = [];
    
    keyElements.forEach(element => {
      const content = this.cleanContent(element.content);
      if (!uniqueContent.has(content)) {
        uniqueContent.add(content);
        summaryLines.push(content);
      }
    });
    
    return summaryLines.join(' ');
  }
  
  /**
   * 提取增强的关键词
   */
  extractEnhancedKeywords(content, keyElements) {
    const wordCount = {};
    const commonWords = ['的', '了', '在', '是', '有', '和', '与', '等', '这个', '一个', '一些'];
    
    // 分析所有内容
    const words = content.split(/[\s\.,，。!！?？;；:：]+/);
    
    words.forEach(word => {
      const cleanWord = word.trim();
      if (cleanWord.length > 1 && !commonWords.includes(cleanWord)) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // 从关键元素中提取额外的关键词
    keyElements.forEach(element => {
      const elementWords = element.content.split(/[\s\.,，。!！?？;；:：]+/);
      elementWords.forEach(word => {
        const cleanWord = word.trim();
        if (cleanWord.length > 1 && !commonWords.includes(cleanWord)) {
          wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 5; // 给重要内容额外权重
        }
      });
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }
  
  /**
   * 计算置信度
   */
  calculateConfidence(keyElements) {
    const totalScore = keyElements.reduce((sum, element) => sum + element.score, 0);
    const maxPossibleScore = keyElements.length * 3; // 最大分数3分
    return Math.min(totalScore / maxPossibleScore, 1.0);
  }
  
  /**
   * 辅助函数
   */
  getHeadingLevel(text) {
    return text.match(/^#+/)[0].length;
  }
  
  isOrderedList(text) {
    return /^\d+\./.test(text);
  }
  
  extractHighlights(text) {
    const highlights = [];
    const boldMatches = text.match(/\*\*(.*?)\*\*/g);
    const italicMatches = text.match(/\*(.*?)\*/g);
    const codeMatches = text.match(/`(.*?)`/g);
    
    if (boldMatches) highlights.push(...boldMatches.map(m => m.replace(/\*\*/g, '')));
    if (italicMatches) highlights.push(...italicMatches.map(m => m.replace(/\*/g, '')));
    if (codeMatches) highlights.push(...codeMatches.map(m => m.replace(/`/g, '')));
    
    return highlights;
  }
  
  cleanContent(text) {
    return text.replace(/[\*`_]/g, '').trim();
  }
}

// 导出模块
module.exports = EnhancedSummaryGenerator;