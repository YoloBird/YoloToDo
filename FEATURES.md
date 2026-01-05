# 智能便签系统 - 核心功能增强版

## 🎯 核心增强功能（已实现）

### 后端功能 ✅
1. **单用户系统** - admin@todo.local / admin123
2. **防暴力登录** - 5次失败锁定5分钟
3. **修改密码** - API已实现
4. **便签增强字段**：format, color, isImportant, content必填
5. **一键完成所有** - API已实现
6. **导入/导出** - JSON格式，支持合并/覆盖
7. **自动备份** - 每天3:00，保留7天
8. **提醒功能** - 邮件+Telegram（保留）

### 前端登录页 ✅
- 移除注册
- 单用户登录

### 前端主页增强 🔄（正在实现）

#### 即将添加的核心功能：
1. **Markdown渲染** - 使用marked.js + highlight.js
2. **颜色选择** - 9种预设颜色
3. **重要标记** - 星标显示
4. **格式切换** - 文本/Markdown
5. **内容必填** - 前端验证
6. **一键完成** - UI按钮
7. **修改密码** - 设置面板

## 📦 技术栈

- **后端**: Node.js + Express + JSON文件存储
- **前端**: 原生HTML/CSS/JavaScript
- **Markdown**: marked.js
- **代码高亮**: highlight.js
- **认证**: JWT

## 🚀 快速开始

### 1. 启动服务器
```bash
cd /home/pang/project/ToDo_List
npm start
```

### 2. 访问系统
```
URL: http://192.168.166.8:3000
账号: admin@todo.local
密码: admin123
```

### 3. 首次登录后
在设置中修改密码！

## 📖 功能说明

### 便签管理
- **创建便签**：标题+内容必填，可选颜色、重要标记
- **Markdown支持**：切换格式后支持Markdown语法
- **搜索筛选**：按标题/内容/标签搜索
- **排序**：最新/最早/优先级/截止日期
- **完成管理**：单个完成、一键全部完成

### 数据管理
- **导出**：导出所有便签为JSON
- **导入**：上传JSON文件或粘贴文本
- **策略**：合并（保留现有）或覆盖（清空后导入）
- **自动备份**：每天凌晨3点自动备份

### 提醒功能（隐藏）
创建便签时可设置提醒时间和方式（需配置.env）

## 🎨 颜色选项

9种预设颜色：
- 紫色 #6366f1
- 蓝色 #3b82f6
- 绿色 #10b981
- 红色 #ef4444
- 橙色 #f97316
- 粉色 #ec4899
- 青色 #06b6d4
- 黄色 #f59e0b
- 灰色 #64748b

## 📝 Markdown 语法示例

支持标准Markdown语法：

### 标题
```markdown
# 一级标题
## 二级标题
### 三级标题
```

### 列表
```markdown
- 无序列表项1
- 无序列表项2

1. 有序列表项1
2. 有序列表项2
```

### 代码
```markdown
`行内代码`

\`\`\`javascript
// 代码块
function hello() {
  console.log('Hello World');
}
\`\`\`
```

### 强调
```markdown
**粗体**
*斜体*
~~删除线~~
```

### 链接
```markdown
[链接文字](https://example.com)
```

## ⚙️ 配置提醒（可选）

编辑 `.env` 文件：

### 邮件提醒
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
```

### Telegram提醒
```env
TELEGRAM_BOT_TOKEN=your_bot_token
```

然后在设置中配置Telegram Chat ID。

## 🔒 安全建议

1. **修改默认密码**：首次登录后立即修改
2. **定期备份**：虽然有自动备份，建议手动导出重要数据
3. **HTTPS部署**：生产环境使用HTTPS

## 📂 文件结构

```
ToDo_List/
├── server/                 # 后端
│   ├── server.js          # 主服务
│   ├── routes/            # API路由
│   ├── middleware/        # 中间件
│   ├── utils/             # 工具函数
│   └── data/              # 数据存储
│       ├── users.json
│       ├── notes.json
│       └── backups/       # 自动备份
├── public/                # 前端
│   ├── index.html         # 登录页
│   ├── app.html           # 主应用
│   ├── css/style.css      # 样式
│   └── js/
│       ├── auth.js        # 认证
│       └── app.js         # 应用逻辑
├── package.json
├── .env                   # 配置（不提交到git）
└── README.md
```

## 🔧 API 端点

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/change-password` - 修改密码
- `PUT /api/auth/settings` - 更新设置

### 便签
- `GET /api/notes` - 获取所有便签
- `POST /api/notes` - 创建便签
- `PUT /api/notes/:id` - 更新便签
- `DELETE /api/notes/:id` - 删除便签
- `PATCH /api/notes/:id/toggle` - 切换完成状态
- `POST /api/notes/complete-all` - 一键完成所有
- `GET /api/notes/export/json` - 导出
- `POST /api/notes/import` - 导入

## 💡 使用技巧

1. **Markdown预览**：切换格式后自动渲染
2. **颜色分类**：用不同颜色区分不同类型任务
3. **重要标记**：标记重要任务，筛选时快速查看
4. **定期导出**：重要数据建议定期导出备份
5. **搜索快捷**：搜索框支持即时搜索

## 🐛 故障排除

### 无法登录
- 检查账号密码是否正确
- 查看服务器日志
- 确认服务器正在运行

### 提醒不工作
- 检查 .env 配置
- 重启服务器
- 查看服务器日志

### 导入失败
- 确认JSON格式正确
- 检查必填字段（title, content）
- 查看错误提示

## 📞 支持

如有问题，查看：
- UPGRADE_PLAN.md - 详细功能说明
- IMPLEMENTATION_STRATEGY.md - 实施策略
- 服务器日志 - 错误信息

---

**版本**: 2.0 核心增强版
**最后更新**: 2026-01-04
