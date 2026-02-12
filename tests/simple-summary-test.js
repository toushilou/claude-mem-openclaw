const EnhancedSummaryGenerator = require('../src/enhancements/summary-optimization');
const fs = require('fs');
const path = require('path');

async function testSummaryGenerator() {
  console.log('🧠 测试增强版摘要生成器');
  console.log('='.repeat(50));
  
  try {
    const generator = new EnhancedSummaryGenerator();
    
    // 1. 直接文件测试
    const testFile = path.join(__dirname, '../memory/2026-02-08.md');
    if (!fs.existsSync(testFile)) {
      console.error('❌ 测试文件不存在');
      console.log('📄 使用模拟内容测试');
      
      // 使用模拟内容
      const testContent = `# 测试文档
这是一个测试文档，用于验证增强版摘要生成器的功能。

## 主要特点
- ✅ 智能分析内容类型
- ✅ 多维度质量评估
- ✅ 增强的关键词提取
- ✅ 支持Markdown格式
- ✅ 并行处理优化

## 使用场景
该系统主要用于 **OpenClaw** 项目中的文档摘要生成，通过智能分析内容结构和语义信息，提供高质量的文档摘要。

### 技术亮点
1. **内容类型识别**：自动识别标题、列表、代码块等
2. **质量评估**：基于内容长度、结构复杂度评分
3. **置信度计算**：评估摘要的可靠性
4. **智能截断**：在段落边界处截断文本
5. **增强关键词**：从关键部分提取关键词
`;

      testGenerator(generator, testContent);
    } else {
      console.log('📄 读取测试文件:');
      const content = fs.readFileSync(testFile, 'utf8');
      
      const analysis = generator.analyzeContent(content);
      console.log(`   标题: ${analysis.headings.length}个`);
      console.log(`   列表: ${analysis.lists.length}个`);
      console.log(`   高亮: ${analysis.highlighted.length}个`);
      console.log(`   表格: ${analysis.tables.length}个`);
      console.log(`   文本块: ${analysis.textBlocks.length}个`);
      
      const summary = generator.extractEnhancedSummary(content);
      
      console.log('📝 生成的摘要:');
      console.log(summary.summary);
      
      console.log('🔑 提取的关键词:');
      console.log(summary.keywords);
      
      console.log('📊 质量评分:');
      console.log(`   分数: ${summary.quality}/10`);
      console.log(`   置信度: ${summary.confidence.toFixed(2)}`);
    }
    
    console.log('\n✅ 摘要生成器测试成功');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

function testGenerator(generator, content) {
  const start = Date.now();
  const analysis = generator.analyzeContent(content);
  
  console.log(`📄 内容分析:`);
  console.log(`   标题: ${analysis.headings.length}个`);
  console.log(`   列表: ${analysis.lists.length}个`);
  console.log(`   高亮: ${analysis.highlighted.length}个`);
  console.log(`   表格: ${analysis.tables.length}个`);
  console.log(`   文本块: ${analysis.textBlocks.length}个`);
  
  const summary = generator.extractEnhancedSummary(content);
  
  console.log(`📝 生成的摘要: (${Date.now() - start}ms)`);
  console.log(summary.summary);
  
  console.log(`🔑 提取的关键词: (${summary.keywords.length}个)`);
  console.log(summary.keywords);
  
  console.log(`📊 质量评分:`);
  console.log(`   分数: ${summary.quality}/10`);
  console.log(`   置信度: ${summary.confidence.toFixed(2)}`);
  
  return summary;
}

testSummaryGenerator();