# Ad Astra - 目标规划星图(DEMO)

***该分支为项目demo，正式版已上传至main分支***

将任务拆解为可交互的 3D 星系。输入一个目标，AI 自动生成科学的任务树，以星球和轨道的形态可视化呈现。点击叶子节点点亮星球，追踪进度。

## 技术栈

- **React** + **Vite** — 前端框架与构建
- **Three.js** + **@react-three/fiber** + **@react-three/drei** — 3D 渲染
- **@react-three/postprocessing** — Bloom 后期特效
- **Zustand** + **Immer** — 状态管理与不可变更新
- **Tailwind CSS v4** — 样式
- **DeepSeek API** — AI 任务拆解

## 快速开始

```bash
# 安装依赖
npm install

# 创建 .env（参考 .env.example）
cp .env.example .env
# 编辑 .env，填入 API Key

# 启动开发
npm run dev
```

## 操作指南

| 操作 | 效果 |
|------|------|
| 左键拖拽 | 旋转视角 |
| 滚轮 | 缩放 |
| 右键拖拽 | 平移 |
| 左键点击星球 | 打开编辑面板 |
| 中键点击星球 | 锁定追踪 |
| 输入目标 + 生成 | AI 拆解为星图 |

## 项目结构

```
src/
├── components/
│   ├── PlanetNode.jsx    # 递归星球组件（材质、大气层、轨道）
│   ├── Sidebar.jsx       # 左侧星图列表抽屉
│   ├── StarMapPanel.jsx  # 顶部进度面板
│   ├── GoalInput.jsx     # 底部 AI 输入框
│   └── PlanetDialog.jsx  # 星球详情弹窗（已废弃，改为 3D 标注）
├── services/
│   └── llmService.js     # AI API 调用 + System Prompt
├── store/
│   └── useTaskStore.js   # Zustand 状态管理（持久化到 localStorage）
├── types/
│   └── TaskNode.ts       # TaskNode 类型定义
└── App.jsx               # 场景入口（灯光、Bloom、转场动画）
public/textures/          # 星球贴图资源
```

## 环境变量

```bash
VITE_API_KEY=your-api-key     # LLM API Key
VITE_API_BASE=your-api-base   # API 地址
```

## 构建与部署

```bash
npm run build      
npx vite preview   
```