/**
 * claude-mem OpenClaw - 主入口
 * 分层记忆压缩系统
 */

// 导出所有核心组件
const enhanced_memory_search = require('./enhanced_memory_search.js');
const SummaryGenerator = require('./summary_generator.js');
const MemorySystem = require('./memory_system.js');
const heartbeat_optimized = require('./heartbeat_optimized.js');

// 导出工具函数
function getMemorySystem(options) {
  return new MemorySystem(options);
}

function createSummaryGenerator(options) {
  return new SummaryGenerator(options);
}

module.exports = {
  // 核心系统
  MemorySystem,
  SummaryGenerator,
  
  // 工具函数
  getMemorySystem,
  createSummaryGenerator,
  
  // 底层组件
  enhancedMemorySearch: enhanced_memory_search.enhancedMemorySearch,
  CONFIG: enhanced_memory_search.CONFIG,
  
  // 实用工具
  heartbeatOptimized: heartbeat_optimized.optimizedHeartbeatCheck,
  
  // 版本信息
  version: '1.0.0',
  description: '分层记忆压缩系统 for OpenClaw'
};