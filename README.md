# 🧠 claude-mem OpenClaw

基于claude-mem理念的分层记忆压缩系统，专为OpenClaw集成优化。

## 🚀 项目介绍

一个开源的分层记忆压缩系统，将claude-mem的核心思想（渐进式披露、token优化、智能摘要）应用到OpenClaw平台，显著减少心跳检查和记忆搜索的token消耗。

## 📊 核心特性

- **🎯 分层搜索模式**: index/compact/full/auto 四种模式
- **💰 Token优化**: 心跳检查节省70-90% token消耗
- **⚡ 智能摘要库**: 预生成摘要，避免重复计算
- **🔌 即插即用**: 不破坏现有OpenClaw系统
- **📈 向后兼容**: 传统和优化模式无缝切换

## 🛠️ 快速开始

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/claude-mem-openclaw.git
cd claude-mem-openclaw

# 2. 安装依赖
npm install

# 3. 初始化配置
cp examples/config.example.json config.json
# 编辑config.json设置你的memory目录
```

### 基本使用

```javascript
// 引入系统
const { MemorySystem } = require('./src');

// 初始化
const memory = new MemorySystem({
  memoryDir: '/path/to/your/memory',
  autoUpdateSummaries: true
});

await memory.initialize();

// 搜索记忆
const results = await memory.search('你的查询', {
  mode: 'compact', // index | compact | full | auto
  limit: 10
});

console.log(results);
```

### 心跳检查优化

```bash
# 运行优化版心跳检查
node examples/heartbeat-optimized.js

# 实时查看节省效果：
# 🫀 优化版心跳检查开始
# 📊 心跳检查完成报告
# 传统方法: ~3000 tokens
# 优化方法: ~500 tokens
# 🔥 节省: 2500 tokens (83%)
```

## 📁 架构说明

```
claude-mem-openclaw/
├── src/                    # 核心源代码
│   ├── enhanced_memory_search.js  # 分层搜索引擎
│   ├── summary_generator.js      # 智能摘要生成器
│   ├── memory_system.js          # 统一API接口
│   └── heartbeat_optimized.js    # 优化心跳检查
├── examples/              # 使用示例
├── tests/                 # 测试用例
├── docs/                  # 文档
├── package.json          # 项目配置
└── README.md             # 本文档
```

## 🧪 性能对比

| 场景 | 传统方法 | 优化方法 | 节省 |
|------|----------|----------|------|
| 心跳检查 | ~3000 tokens | ~500 tokens | 83% |
| 日常查询 | ~800 tokens | ~200 tokens | 75% |
| 历史回顾 | ~5000 tokens | ~1000 tokens | 80% |

## 🔌 OpenClaw集成

### 添加到现有OpenClaw

```javascript
// 在你的AGENTS.md或工具配置中添加：
memory_search: "使用分层记忆系统搜索"
heartbeat: "调用优化版心跳检查"

// 或直接替换现有调用：
// 原: memory_search(query)
// 新: enhanced_memory_search(query, {mode: 'compact'})
```

### 创建技能包

本项目也可作为OpenClaw技能包分发，一键安装即可获得所有优化功能。

## 📄 许可证

MIT License - 详见 LICENSE 文件

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 💬 支持

如有问题或建议，请：
1. 查看 [Issues](https://github.com/your-username/claude-mem-openclaw/issues)
2. 查阅 [Wiki](https://github.com/your-username/claude-mem-openclaw/wiki)
3. 参与讨论

## 🙏 致谢

- 灵感来自 [claude-mem](https://github.com/thedotmack/claude-mem) 项目
- 基于 [OpenClaw](https://openclaw.ai) 平台优化
- 所有贡献者和用户

---

**立即开始节省token成本！** 🎉

[📖 查看详细文档](docs/) | [🧪 运行示例](examples/) | [🐛 报告问题](https://github.com/your-username/claude-mem-openclaw/issues)