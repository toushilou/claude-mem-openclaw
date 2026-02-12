/**
 * 并行搜索优化 - 短期优化2
 * 启用并行处理，提升搜索速度
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const EnhancedSummaryGenerator = require('./summary-optimization');

/**
 * 并行搜索管理器
 */
class ParallelSearchManager {
  constructor(options = {}) {
    this.config = {
      maxWorkers: options.maxWorkers || 2,
      timeout: options.timeout || 5000,
      retryCount: options.retryCount || 2,
      ...options
    };
    
    this.workers = new Map();
    this.tasks = [];
    this.isActive = false;
    
    console.log('⚡ 并行搜索管理器初始化');
    console.log(`   配置: ${this.config.maxWorkers}个工作线程, ${this.config.timeout}ms超时`);
  }
  
  /**
   * 启动并行搜索
   */
  async start() {
    if (this.isActive) return;
    
    this.isActive = true;
    
    // 创建工作线程
    for (let i = 0; i < this.config.maxWorkers; i++) {
      await this.createWorker(i);
    }
    
    console.log(`✅ 并行搜索管理器启动: ${this.config.maxWorkers}个工作线程`);
  }
  
  /**
   * 创建工作线程
   */
  async createWorker(id) {
    const worker = new Worker(__filename, {
      workerData: {
        workerId: id,
        config: this.config
      }
    });
    
    worker.on('message', (message) => {
      this.handleWorkerMessage(id, message);
    });
    
    worker.on('error', (error) => {
      console.error(`❌ Worker ${id} 错误:`, error);
      this.recoverWorker(id);
    });
    
    worker.on('exit', (code) => {
      console.log(`📤 Worker ${id} 退出:`, code);
      if (this.isActive && code !== 0) {
        this.recoverWorker(id);
      }
    });
    
    this.workers.set(id, worker);
  }
  
  /**
   * 恢复工作线程
   */
  async recoverWorker(id) {
    console.log(`🔄 正在恢复Worker ${id}...`);
    setTimeout(() => {
      this.createWorker(id);
    }, 1000);
  }
  
  /**
   * 处理工作线程消息
   */
  handleWorkerMessage(workerId, message) {
    switch (message.type) {
      case 'ready':
        console.log(`✅ Worker ${workerId} 准备就绪`);
        this.assignTask(workerId);
        break;
        
      case 'completed':
        console.log(`✅ Worker ${workerId} 任务完成:`, message.taskId);
        this.handleTaskCompletion(message);
        this.assignTask(workerId);
        break;
        
      case 'error':
        console.error(`❌ Worker ${workerId} 任务错误:`, message.error);
        this.handleTaskError(message);
        this.assignTask(workerId);
        break;
    }
  }
  
  /**
   * 添加搜索任务
   */
  addTask(query, options = {}) {
    const taskId = this.generateTaskId();
    const task = {
      id: taskId,
      query,
      options,
      startTime: Date.now(),
      attempts: 0,
      status: 'pending'
    };
    
    this.tasks.push(task);
    
    // 立即尝试分配
    if (this.isActive) {
      this.assignTask();
    }
    
    return taskId;
  }
  
  /**
   * 分配任务
   */
  assignTask(workerId = null) {
    if (this.tasks.length === 0) return;
    
    const workersToCheck = workerId ? [workerId] : Array.from(this.workers.keys());
    
    for (const id of workersToCheck) {
      const worker = this.workers.get(id);
      
      // 查找待处理任务
      const task = this.tasks.find(t => t.status === 'pending');
      if (!task) continue;
      
      // 发送任务到工作线程
      task.status = 'processing';
      task.workerId = id;
      task.startTime = Date.now();
      
      try {
        worker.postMessage({
          type: 'search',
          taskId: task.id,
          query: task.query,
          options: task.options
        });
      } catch (error) {
        console.error(`❌ 任务分配失败:`, error);
        task.status = 'failed';
        task.attempts++;
        if (task.attempts <= this.config.retryCount) {
          task.status = 'pending';
        }
      }
    }
  }
  
  /**
   * 处理任务完成
   */
  handleTaskCompletion(message) {
    const task = this.tasks.find(t => t.id === message.taskId);
    if (!task) return;
    
    task.status = 'completed';
    task.endTime = Date.now();
    task.duration = task.endTime - task.startTime;
    task.results = message.results;
    
    this.notifyCompletion(task);
  }
  
  /**
   * 处理任务错误
   */
  handleTaskError(message) {
    const task = this.tasks.find(t => t.id === message.taskId);
    if (!task) return;
    
    task.status = 'failed';
    task.attempts++;
    task.error = message.error;
    
    if (task.attempts <= this.config.retryCount) {
      task.status = 'pending';
    } else {
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;
      this.notifyCompletion(task);
    }
  }
  
  /**
   * 任务完成通知
   */
  notifyCompletion(task) {
    console.log(`📊 任务 ${task.id} 完成: ${task.duration}ms, 状态: ${task.status}`);
    
    // 清理任务
    this.tasks = this.tasks.filter(t => t.id !== task.id);
  }
  
  /**
   * 停止并行搜索
   */
  async stop() {
    this.isActive = false;
    
    for (const [id, worker] of this.workers.entries()) {
      try {
        worker.terminate();
        console.log(`✅ Worker ${id} 已终止`);
      } catch (error) {
        console.error(`❌ Worker ${id} 终止失败:`, error);
      }
    }
    
    this.workers.clear();
    this.tasks = [];
  }
  
  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 工作线程实现
 */
if (!isMainThread) {
  const generator = new EnhancedSummaryGenerator();
  
  parentPort.postMessage({ type: 'ready' });
  
  parentPort.on('message', async (message) => {
    if (message.type === 'search') {
      await handleSearch(message);
    }
  });
  
  async function handleSearch(message) {
    try {
      console.log(`📝 Worker ${workerData.workerId} 正在处理任务: ${message.taskId}`);
      
      const startTime = Date.now();
      
      // 执行搜索
      const results = await performSearch(
        message.query, 
        message.options
      );
      
      const duration = Date.now() - startTime;
      
      console.log(`✅ Worker ${workerData.workerId} 完成任务: ${message.taskId}, ${duration}ms`);
      
      parentPort.postMessage({
        type: 'completed',
        taskId: message.taskId,
        results,
        duration
      });
      
    } catch (error) {
      console.error(`❌ Worker ${workerData.workerId} 任务错误:`, error);
      
      parentPort.postMessage({
        type: 'error',
        taskId: message.taskId,
        error: error.message
      });
    }
  }
  
  async function performSearch(query, options) {
    // 模拟搜索实现 - 使用摘要库搜索
    const memoryDir = process.env.HOME ? 
      `${process.env.HOME}/.openclaw/workspace/memory` : 
      '.openclaw/workspace/memory';
    
    const results = [];
    
    if (!require('fs').existsSync(memoryDir)) {
      return results;
    }
    
    const files = require('fs').readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    
    // 并发读取文件（使用Promise）
    const readPromises = files.slice(0, 5).map(filename => {
      return new Promise((resolve) => {
        const filepath = require('path').join(memoryDir, filename);
        try {
          const content = require('fs').readFileSync(filepath, 'utf8');
          
          const score = calculateRelevance(query, content);
          if (score > (options.minScore || 0.3)) {
            resolve(processFile(filename, filepath, content, score));
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error(`❌ 读取文件错误:`, error);
          resolve(null);
        }
      });
    });
    
    const processedResults = await Promise.all(readPromises);
    return processedResults.filter(r => r !== null).sort((a, b) => b.score - a.score);
  }
  
  function calculateRelevance(query, content) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let score = 0;
    
    queryWords.forEach(word => {
      if (contentLower.includes(word)) {
        score += 0.3 + (word.length / 10);
      }
    });
    
    return Math.min(score, 1.0);
  }
  
  function processFile(filename, filepath, content, score) {
    const lines = content.split('\n');
    const firstLine = lines[0] || '';
    
    return {
      id: `parallel-${Date.now()}-${Math.random()}`,
      title: firstLine.length > 0 ? firstLine : filename,
      filename,
      path: filepath,
      score,
      content: generator.synthesizeSummary(content),
      keywords: generator.extractEnhancedKeywords(content),
      modified: require('fs').statSync(filepath).mtime
    };
  }
}

module.exports = ParallelSearchManager;