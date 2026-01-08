# API 文档

所有接口基于 `/api`，除登录外均需要 `Authorization: Bearer <token>`。

## 认证

### 登录

- `POST /api/auth/login`
- Body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

### 修改密码

- `POST /api/auth/change-password`
- Body:

```json
{
  "oldPassword": "old",
  "newPassword": "newpassword"
}
```

### 更新用户设置

- `PUT /api/auth/settings`
- Body:

```json
{
  "telegramChatId": "123456789",
  "notificationEmail": "name@example.com"
}
```

### 更新账号用户名

- `PUT /api/auth/account`
- Body:

```json
{
  "username": "newname"
}
```

### 测试 Telegram

- `POST /api/auth/settings/test-telegram`
- Body:

```json
{
  "telegramChatId": "123456789"
}
```

### 测试邮件

- `POST /api/auth/settings/test-email`
- Body:

```json
{
  "notificationEmail": "name@example.com"
}
```

---

## 待办（Notes）

- `GET /api/notes` 获取当前用户便签
- `GET /api/notes/archived` 获取归档便签
- `GET /api/notes/:id` 获取单条便签
- `POST /api/notes` 新建便签
- `PUT /api/notes/:id` 更新便签
- `DELETE /api/notes/:id` 删除便签
- `PATCH /api/notes/:id/toggle` 切换完成状态
- `PATCH /api/notes/:id/subtask/:subtaskId` 切换子任务状态
- `POST /api/notes/complete-all` 全部标记完成
- `POST /api/notes/:id/archive` 归档
- `POST /api/notes/:id/unarchive` 取消归档
- `GET /api/notes/export/json` 导出 JSON
- `POST /api/notes/import` 导入 JSON

创建便签 Body（示例）：

```json
{
  "title": "任务标题",
  "content": "任务内容",
  "format": "text",
  "color": "#3b82f6",
  "tags": ["工作"],
  "isImportant": true,
  "category": "工作",
  "priority": "high",
  "dueDate": "2025-01-01T12:00:00.000Z",
  "reminderDate": "2024-12-31T12:00:00.000Z",
  "reminderMethods": ["email", "telegram"],
  "subtasks": [{ "text": "子任务" }]
}
```

---

## 想法（Ideas）

- `GET /api/ideas`
- `GET /api/ideas/:id`
- `POST /api/ideas`
- `PUT /api/ideas/:id`
- `DELETE /api/ideas/:id`
- `GET /api/ideas/export/json`
- `POST /api/ideas/import`

---

## 日记（Diaries）

- `GET /api/diaries`
- `GET /api/diaries/:id`
- `POST /api/diaries`
- `PUT /api/diaries/:id`
- `DELETE /api/diaries/:id`

创建日记 Body（示例）：

```json
{
  "title": "今天的记录",
  "content": "正文内容",
  "mood": "平静",
  "weather": "晴",
  "tags": ["生活"],
  "entryDate": "2025-01-01"
}
```

---

## 目标（Goals）

- `GET /api/goals`
- `GET /api/goals/:id`
- `POST /api/goals`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`

目标记录：

- `POST /api/goals/:id/records`
- `PUT /api/goals/:id/records/:recordId`
- `DELETE /api/goals/:id/records/:recordId`

创建目标 Body（示例）：

```json
{
  "title": "一年内完成一次马拉松",
  "vision": "提升体能",
  "category": "健康",
  "tags": ["长期"],
  "status": "active",
  "startDate": "2025-01-01",
  "targetDate": "2025-12-31",
  "progress": 10
}
```

创建记录 Body（示例）：

```json
{
  "title": "灵感记录",
  "content": "内容",
  "type": "inspiration",
  "tags": ["资料"],
  "date": "2025-01-01"
}
```
