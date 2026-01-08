# 智能笔记系统 - 功能需求文档

> 版本: 3.4
> 最后更新: 2026-01-07
> 维护者: 开发团队

---

## 一、已完成功能

### 1.1 归档系统 (v3.1)

**功能说明**：将不再需要在主列表显示的便签移入归档箱，保持主列表清爽。

**与"已完成"的区别**：
- 已完成：任务完成状态，仍显示在主列表
- 归档：冷存储，从主列表移除但保留历史记录

**v3.2 优化**：
- 归档按钮改为纯图标形式，与其他操作按钮统一
- 时光看板现在包含归档任务的统计（显示为已归档状态）

**代码逻辑**：
```
后端:
- server/utils/db.js
  - getNotesByUserId(): 默认排除 archived=true 的便签
  - getArchivedNotesByUserId(): 仅返回 archived=true 的便签
  - archiveNote(id): 设置 archived=true, archivedAt=当前时间
  - unarchiveNote(id): 设置 archived=false, archivedAt=null

- server/routes/notes.js
  - GET /api/notes/archived: 获取归档列表
  - POST /api/notes/:id/archive: 归档便签
  - POST /api/notes/:id/unarchive: 恢复便签

前端:
- public/js/modules/state.js
  - NotesState.archivedNotes: 归档便签列表
  - NotesState.viewMode: 'active' | 'archived' 视图模式

- public/js/modules/notes.js
  - loadArchivedNotes(): 加载归档便签
  - archiveNote(id): 归档操作
  - unarchiveNote(id): 恢复操作
  - toggleArchiveView(): 切换视图
  - createNoteCard(): 根据 isArchived 显示不同按钮

- public/js/modules/timeline.js (v3.2新增)
  - loadTimeline(): 同时加载活跃和归档便签
  - renderDayTimeline(): 归档任务显示特殊样式
```

**UI元素**：
- 待办页面统计区：已归档数量
- 操作栏：归档箱图标按钮（切换视图）
- 便签卡片：归档/恢复按钮

---

### 1.2 子任务/检查清单 (v3.1)

**功能说明**：便签可包含多个子任务，每个子任务可独立勾选完成。

**数据结构**：
```javascript
// 便签中的 subtasks 字段
subtasks: [
  { id: "1767630415848_0", text: "子任务内容", completed: false },
  { id: "1767630415848_1", text: "另一个子任务", completed: true }
]
```

**代码逻辑**：
```
后端:
- server/routes/notes.js
  - POST /api/notes: 创建时处理 subtasks 数组
  - PUT /api/notes/:id: 更新时保留 subtasks
  - PATCH /api/notes/:id/subtask/:subtaskId: 切换子任务完成状态

前端:
- public/js/modules/state.js
  - NotesState.subtasks: 编辑中的子任务临时存储

- public/js/modules/notes.js
  - renderSubtasksEditor(): 渲染子任务编辑器
  - addSubtaskItem(): 添加子任务输入框
  - removeSubtaskItem(index): 删除子任务
  - toggleSubtask(noteId, subtaskId): 切换子任务状态
  - createNoteCard(): 渲染子任务列表和进度条

- public/app.html
  - #subtasksEditor: 子任务编辑器容器

- public/css/style.css
  - .note-subtasks: 卡片中子任务区域
  - .subtasks-progress-bar: 进度条
  - .subtask-item: 子任务项
  - .subtasks-editor-*: 编辑器样式
  - .subtasks-toggle-btn: 展开/折叠按钮
  - .subtasks-collapsed: 折叠区域
```

**v3.1.1 优化**：
- [x] 子任务超过3个时自动折叠，显示"展开剩余N项"按钮
- [ ] 时光看板需要统计子任务完成情况
- [ ] 提醒模板需要包含子任务内容

---

### 1.3 随机灵感卡片 (v3.1)

**功能说明**：从已记录的灵感中随机抽取一条显示。

**代码逻辑**：
```
前端:
- public/js/modules/ideas.js
  - showRandomIdea(): 随机选择并显示灵感
  - closeRandomIdeaModal(): 关闭弹窗
  - reshuffleIdea(): 再抽一条

- public/app.html
  - #randomIdeaBtn: 触发按钮（位于想法页操作组内）
  - #randomIdeaModal: 展示弹窗

- public/css/style.css
  - .random-idea-card: 灵感卡片样式
  - .modal-random-idea: 弹窗样式
```

**v3.1.1 优化**：
- [x] 按钮位置调整，融入操作栏（使用btn-ghost样式）
- [ ] 可以设置随机范围（按分类、时间等）

---

### 1.4 快速入口浮窗 FAB (v3.1)

**功能说明**：屏幕右下角悬浮按钮，快速添加待办或灵感。

**代码逻辑**：
```
前端:
- public/js/modules/ui.js
  - initFAB(): 初始化FAB事件
  - 点击主按钮: toggle .open 类
  - 点击子按钮: 触发对应的添加Modal

- public/app.html
  - #quickAddFab: FAB容器
  - #fabMainBtn: 主按钮
  - #fabAddNote: 添加待办
  - #fabAddIdea: 添加灵感

- public/css/style.css
  - .fab-container: 容器定位
  - .fab-main: 主按钮样式
  - .fab-menu: 菜单容器
  - .fab-item: 菜单项
```

---

## 二、待开发功能

### 阶段二

#### 2.1 优先级矩阵视图（艾森豪威尔矩阵）✅ (v3.3 已完成)
- [x] 四象限展示：紧急重要、重要不紧急、紧急不重要、不紧急不重要
- [x] 根据任务优先级和截止日期自动分类
- [x] 支持任务点击交互
- [x] 响应式布局支持

**代码逻辑**：
```
前端:
- public/js/modules/matrix.js
  - MatrixState: 矩阵状态管理
  - loadMatrixData(): 加载并分类任务
  - classifyNotes(): 按紧急/重要程度分类
  - renderMatrix(): 渲染四象限视图
  - getMatrixStats(): 获取各象限统计

- public/js/modules/timeline.js
  - 时光看板集成优先级矩阵
```

### 阶段三

#### 3.1 目标管理系统
- 长期目标设定
- 子目标分解
- 进度追踪

#### 3.2 人生各领域追踪
- 预设领域：工作、健康、学习、社交、财务等
- 各领域评分和趋势

#### 3.3 个人数据仪表盘
- 综合数据可视化
- 完成率、趋势图、排行榜

#### 3.4 每日智能摘要推送
- 邮件/Telegram 推送
- 每日待办提醒
- 周报生成

### 阶段四

#### 4.1 PWA 移动端支持
- Service Worker 离线缓存
- 安装到桌面
- 推送通知

#### 4.2 浏览器扩展
- 快速捕捉灵感
- 网页选中文字保存

---

## 三、已知问题和优化项

### UI/UX 问题 (v3.2 已修复)
- [x] 归档箱按钮样式与周围元素不协调 → 改为纯图标按钮
- [x] 随机灵感按钮位置突兀 → 移入操作组，使用ghost样式
- [x] 子任务过多时卡片过高 → 超过3个自动折叠，可展开
- [x] Modal滚动条样式丑陋 → 大厂级渐变滚动条
- [x] 归档任务不计入时光看板 → 现已包含归档统计

### v3.2 大厂级UI增强
- 全局滚动条美化（Chrome/Firefox/Safari）
- Modal内容区专属滚动条样式
- 按钮点击波纹效果
- 卡片入场动画
- 模态框弹出动画优化
- 输入框焦点过渡效果
- 暗色主题微调
- Focus可访问性增强
- 文本选中颜色定制

### 功能完善
- [ ] 子任务需要在时光看板统计
- [ ] 提醒模板需要更新

---

## 四、文件结构参考

```
public/
├── js/
│   ├── main.js              # 应用入口
│   └── modules/
│       ├── api.js           # API 调用
│       ├── state.js         # 状态管理
│       ├── notes.js         # 便签模块
│       ├── ideas.js         # 灵感模块
│       ├── timeline.js      # 时光看板
│       ├── matrix.js        # 优先级矩阵模块 (v3.3)
│       ├── settings.js      # 设置
│       ├── nav.js           # 导航
│       ├── theme.js         # 主题
│       ├── ui.js            # UI 组件
│       └── utils.js         # 工具函数

server/
├── server.js                # 服务器入口
├── routes/
│   ├── auth.js              # 认证路由
│   ├── notes.js             # 便签路由
│   └── ideas.js             # 灵感路由
├── middleware/
│   └── auth.js              # JWT 认证中间件
├── utils/
│   └── db.js                # 数据库操作
└── data/
    ├── users.json           # 用户数据
    ├── notes.json           # 便签数据
    └── ideas.json           # 灵感数据
```
