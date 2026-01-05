# API 文档

智能便签系统 RESTful API 文档。

## 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `http://localhost:3000/api` |
| 认证方式 | Bearer Token (JWT) |
| 数据格式 | JSON |

## 认证

除登录接口外，所有接口都需要在 Header 中携带 JWT Token：

```
Authorization: Bearer <your_jwt_token>
```

Token 有效期为 7 天。

---

## 认证接口

### 登录

用户登录获取 JWT Token。

```
POST /api/auth/login
```

**请求体：**
```json
{
  "email": "admin@todo.local",
  "password": "admin123"
}
```

**响应 (200)：**
```json
{
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin",
    "email": "admin@todo.local",
    "telegramChatId": null
  }
}
```

**错误响应：**

| 状态码 | 说明 |
|--------|------|
| 400 | 邮箱或密码为空 |
| 401 | 邮箱或密码错误 |
| 429 | 登录失败次数过多，请 5 分钟后重试 |

---

### 修改密码

修改当前用户密码。

```
POST /api/auth/change-password
```

**请求体：**
```json
{
  "oldPassword": "admin123",
  "newPassword": "newSecurePassword123"
}
```

**响应 (200)：**
```json
{
  "message": "密码修改成功，请使用新密码重新登录"
}
```

---

### 更新用户设置

更新用户设置（如 Telegram Chat ID）。

```
PUT /api/auth/settings
```

**请求体：**
```json
{
  "telegramChatId": "123456789"
}
```

**响应 (200)：**
```json
{
  "message": "设置已更新"
}
```

---

## 待办接口

### 获取待办列表

获取当前用户的所有待办。

```
GET /api/notes
```

**响应 (200)：**
```json
[
  {
    "id": "1234567890abc",
    "userId": "admin",
    "title": "完成项目文档",
    "content": "编写 API 文档和部署指南",
    "format": "text",
    "color": "#3b82f6",
    "tags": ["工作", "文档"],
    "isImportant": true,
    "category": "工作",
    "priority": "high",
    "dueDate": "2026-01-10T18:00:00.000Z",
    "reminderDate": "2026-01-10T09:00:00.000Z",
    "reminderMethods": ["email"],
    "reminderSent": false,
    "completed": false,
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-01-05T08:00:00.000Z"
  }
]
```

---

### 获取单个待办

```
GET /api/notes/:id
```

**响应 (200)：** 同上单个对象

**错误响应：**

| 状态码 | 说明 |
|--------|------|
| 404 | 待办不存在 |
| 403 | 无权访问此待办 |

---

### 创建待办

```
POST /api/notes
```

**请求体：**
```json
{
  "title": "项目会议",
  "content": "讨论 Q1 计划",
  "format": "text",
  "color": "#ef4444",
  "tags": ["会议"],
  "isImportant": true,
  "category": "工作",
  "priority": "high",
  "dueDate": "2026-01-10T10:00:00.000Z",
  "reminderDate": "2026-01-10T09:30:00.000Z",
  "reminderMethods": ["email", "telegram"]
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题 |
| content | string | 是 | 内容 |
| format | string | 否 | `text` 或 `markdown`，默认 `text` |
| color | string | 否 | 颜色值，如 `#3b82f6` |
| tags | string[] | 否 | 标签数组 |
| isImportant | boolean | 否 | 是否重要，默认 `false` |
| category | string | 否 | 分类：工作/学习/生活/健康/其他 |
| priority | string | 否 | `low`/`medium`/`high`，默认 `medium` |
| dueDate | string | 否 | 截止日期 ISO 格式 |
| reminderDate | string | 否 | 提醒日期 ISO 格式 |
| reminderMethods | string[] | 否 | `email` 和/或 `telegram` |

**响应 (201)：** 创建的待办对象

---

### 更新待办

```
PUT /api/notes/:id
```

**请求体：** 同创建，所有字段可选

**响应 (200)：** 更新后的待办对象

---

### 删除待办

```
DELETE /api/notes/:id
```

**响应 (200)：**
```json
{
  "message": "待办已删除"
}
```

---

### 切换完成状态

```
PATCH /api/notes/:id/toggle
```

**响应 (200)：** 更新后的待办对象

---

### 一键完成所有

将当前用户所有未完成待办标记为已完成。

```
POST /api/notes/complete-all
```

**响应 (200)：**
```json
{
  "message": "所有待办已标记为完成"
}
```

---

### 导出待办

导出所有待办为 JSON 文件。

```
GET /api/notes/export/json
```

**响应：** 下载 JSON 文件

---

### 导入待办

```
POST /api/notes/import
```

**请求体：**
```json
{
  "notes": [
    {
      "title": "导入的任务",
      "content": "这是导入的内容"
    }
  ],
  "strategy": "merge"
}
```

**策略说明：**
- `merge`：保留现有数据，追加导入数据
- `replace`：删除现有数据，仅保留导入数据

**响应 (200)：**
```json
{
  "message": "成功导入 1 条待办",
  "count": 1,
  "strategy": "merge"
}
```

---

## 想法接口

### 获取想法列表

```
GET /api/ideas
```

**响应 (200)：**
```json
[
  {
    "id": "uuid-here",
    "userId": "admin",
    "title": "产品创意",
    "content": "做一个智能日历应用",
    "category": "灵感",
    "tags": ["产品", "创意"],
    "color": "#8b5cf6",
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-01-05T08:00:00.000Z"
  }
]
```

---

### 创建想法

```
POST /api/ideas
```

**请求体：**
```json
{
  "title": "产品创意",
  "content": "做一个智能日历应用",
  "category": "灵感",
  "tags": ["产品"],
  "color": "#8b5cf6"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题 |
| content | string | 是 | 内容 |
| category | string | 否 | 分类，默认 `灵感` |
| tags | string[] | 否 | 标签数组 |
| color | string | 否 | 颜色值 |

**响应 (201)：** 创建的想法对象

---

### 更新想法

```
PUT /api/ideas/:id
```

**响应 (200)：** 更新后的想法对象

---

### 删除想法

```
DELETE /api/ideas/:id
```

**响应 (200)：**
```json
{
  "message": "删除成功"
}
```

---

### 导出想法

```
GET /api/ideas/export/json
```

**响应：** 下载 JSON 文件

---

### 导入想法

```
POST /api/ideas/import
```

**请求体：**
```json
{
  "ideas": [...],
  "strategy": "merge"
}
```

---

## AI 接口

### 获取 AI 配置

获取 AI 配置（API Key 已脱敏）。

```
GET /api/ai/config
```

**响应 (200)：**
```json
{
  "enabled": true,
  "provider": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-Xu****Tdrv",
    "model": "gpt-4o-mini",
    "hasApiKey": true
  },
  "preferences": {
    "defaultReminderMethods": ["email"],
    "autoSuggestReminder": true,
    "reminderAdvanceMinutes": 30
  }
}
```

---

### 保存 AI 配置

```
POST /api/ai/config
```

**请求体：**
```json
{
  "enabled": true,
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-your-api-key",
  "model": "gpt-4o-mini"
}
```

**响应 (200)：**
```json
{
  "success": true,
  "message": "配置已保存",
  "config": { ... }
}
```

---

### 测试 AI 连接

```
POST /api/ai/config/test
```

**请求体：**
```json
{
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-your-api-key",
  "model": "gpt-4o-mini"
}
```

**响应 (200)：**
```json
{
  "success": true,
  "message": "连接成功",
  "response": "连接成功"
}
```

---

### 获取对话列表

```
GET /api/ai/conversations
```

**响应 (200)：**
```json
[
  {
    "id": "conv_1234567890_abc",
    "title": "今日任务规划",
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-01-05T08:30:00.000Z",
    "messageCount": 4
  }
]
```

---

### 创建对话

```
POST /api/ai/conversations
```

**请求体：**
```json
{
  "title": "新对话"
}
```

**响应 (201)：**
```json
{
  "id": "conv_1234567890_abc",
  "userId": "admin",
  "title": "新对话",
  "createdAt": "2026-01-05T08:00:00.000Z",
  "updatedAt": "2026-01-05T08:00:00.000Z",
  "messages": []
}
```

---

### 获取对话详情

```
GET /api/ai/conversations/:id
```

**响应 (200)：**
```json
{
  "id": "conv_1234567890_abc",
  "userId": "admin",
  "title": "今日任务规划",
  "messages": [
    {
      "id": "msg_1234567890",
      "role": "user",
      "content": "今天我应该做什么？",
      "timestamp": "2026-01-05T08:00:00.000Z"
    },
    {
      "id": "msg_1234567891",
      "role": "assistant",
      "content": "根据你的待办事项...",
      "timestamp": "2026-01-05T08:00:05.000Z"
    }
  ]
}
```

---

### 发送消息

向对话发送消息并获取 AI 回复。

```
POST /api/ai/conversations/:id/messages
```

**请求体：**
```json
{
  "message": "帮我分析一下本周的任务完成情况"
}
```

**响应 (200)：**
```json
{
  "userMessage": {
    "id": "msg_1234567890",
    "role": "user",
    "content": "帮我分析一下本周的任务完成情况",
    "timestamp": "2026-01-05T08:00:00.000Z"
  },
  "assistantMessage": {
    "id": "msg_1234567891",
    "role": "assistant",
    "content": "本周你的任务完成情况如下...",
    "timestamp": "2026-01-05T08:00:05.000Z"
  }
}
```

---

### 删除对话

```
DELETE /api/ai/conversations/:id
```

**响应 (200)：**
```json
{
  "success": true
}
```

---

### 智能解析

将自然语言解析为结构化的任务数据。

```
POST /api/ai/parse
```

**请求体：**
```json
{
  "input": "明天下午3点开项目会议，很重要"
}
```

**响应 (200)：**
```json
{
  "success": true,
  "parsed": {
    "type": "note",
    "confidence": 0.95,
    "data": {
      "title": "项目会议",
      "content": "项目会议",
      "category": "工作",
      "priority": "high",
      "isImportant": true,
      "dueDate": "2026-01-06T15:00:00.000Z",
      "reminderDate": "2026-01-06T14:30:00.000Z",
      "tags": ["会议"]
    }
  }
}
```

---

### 生成周报

```
GET /api/ai/weekly-report
```

**响应 (200)：**
```json
{
  "success": true,
  "stats": {
    "total": 10,
    "completed": 7,
    "ideas": 3,
    "rate": 70
  },
  "report": "## 本周概况\n\n本周你新建了10个任务，完成了7个..."
}
```

---

## 错误响应格式

所有错误响应格式统一：

```json
{
  "error": "错误描述信息"
}
```

## HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
