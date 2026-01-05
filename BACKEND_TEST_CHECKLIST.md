# 🧪 后端功能完整测试清单

## 📋 测试前准备

### 1. 启动服务器

```bash
cd /home/pang/project/ToDo_List

# 确保没有旧数据干扰（可选）
rm -f server/data/users.json server/data/notes.json

# 启动服务器
npm start
```

**预期输出**：
```
⚠️  Default admin account created:
   Email: admin@todo.local
   Password: admin123
   ⚡ Please change password after first login!

========================================
✨ 智能便签系统已启动
========================================
🌐 访问地址: http://localhost:3000
📝 管理员邮箱: admin@todo.local
🔑 默认密码: admin123 (首次登录后请修改)

⚙️  功能状态:
   - JWT Secret: ✅ 已配置
   - 邮件提醒: ❌ 未配置 (或 ✅ 已配置)
   - Telegram: ❌ 未配置 (或 ✅ 已配置)
   - 自动备份: ✅ 每天3:00自动备份
   - 提醒调度: ✅ 每分钟检查一次
========================================
```

---

## 🔐 测试1：认证功能

### 1.1 登录功能 ✅

**方法1：浏览器测试**
1. 打开浏览器访问：http://192.168.166.8:3000
2. 输入账号：`admin@todo.local`
3. 输入密码：`admin123`
4. 点击登录

**预期结果**：
- 显示"登录成功，正在跳转..."
- 自动跳转到 /app 页面

**方法2：curl测试**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@todo.local",
    "password": "admin123"
  }' | jq
```

**预期结果**：
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

**保存token用于后续测试**：
```bash
# 复制返回的token
TOKEN="你的token"
```

### 1.2 防暴力登录测试 ✅

连续5次输入错误密码：

```bash
# 第1次错误
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todo.local","password":"wrong"}' | jq

# 重复4次...

# 第5次错误后，再次尝试
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todo.local","password":"wrong"}' | jq
```

**预期结果（第6次）**：
```json
{
  "error": "登录失败次数过多，请5分钟后重试",
  "lockoutTime": 300000
}
```

### 1.3 修改密码测试 ✅

```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "oldPassword": "admin123",
    "newPassword": "newpass123"
  }' | jq
```

**预期结果**：
```json
{
  "message": "密码修改成功，请使用新密码重新登录"
}

```

**验证新密码**：
```bash
# 用新密码登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@todo.local",
    "password": "newpass123"
  }' | jq
```

**应该成功返回新token**

---

## 📝 测试2：便签增强功能

### 2.1 创建便签（新字段测试）✅

```bash
# 测试1：创建Markdown格式便签
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Markdown测试",
    "content": "# 一级标题\n\n**粗体** *斜体*\n\n```javascript\nconsole.log(\"Hello\");\n```",
    "format": "markdown",
    "color": "#6366f1",
    "isImportant": true,
    "tags": ["测试", "markdown"]
  }' | jq
```

**预期结果**：
```json
{
  "id": "...",
  "userId": "admin",
  "title": "Markdown测试",
  "content": "# 一级标题\n\n**粗体** *斜体*...",
  "format": "markdown",
  "color": "#6366f1",
  "isImportant": true,
  "tags": ["测试", "markdown"],
  "category": null,
  "priority": "medium",
  "completed": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

```bash
# 测试2：创建纯文本便签（带颜色）
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "纯文本测试",
    "content": "这是纯文本内容",
    "format": "text",
    "color": "#ef4444",
    "isImportant": false,
    "priority": "high"
  }' | jq
```

```bash
# 测试3：测试内容必填验证
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "标题",
    "content": ""
  }' | jq
```

**预期结果**：
```json
{
  "error": "内容不能为空"
}
```

### 2.2 获取所有便签 ✅

```bash
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq
```

**预期结果**：
返回数组，包含所有创建的便签

### 2.3 更新便签 ✅

```bash
# 先获取一个便签ID
NOTE_ID="第一个便签的ID"

curl -X PUT http://localhost:3000/api/notes/$NOTE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "更新后的标题",
    "color": "#10b981",
    "isImportant": true
  }' | jq
```

**预期结果**：
返回更新后的便签对象，`updatedAt` 时间已更新

### 2.4 切换完成状态 ✅

```bash
curl -X PATCH http://localhost:3000/api/notes/$NOTE_ID/toggle \
  -H "Authorization: Bearer $TOKEN" | jq
```

**预期结果**：
`completed` 字段变为 `true`

再次调用应该变回 `false`

---

## 🎯 测试3：批量操作

### 3.1 一键完成所有 ✅

```bash
# 先创建几个未完成的便签，然后：
curl -X POST http://localhost:3000/api/notes/complete-all \
  -H "Authorization: Bearer $TOKEN" | jq
```

**预期结果**：
```json
{
  "message": "所有便签已标记为完成"
}
```

**验证**：
```bash
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {title, completed}'
```

所有便签的 `completed` 应该都是 `true`

---

## 📦 测试4：导入导出

### 4.1 导出便签 ✅

```bash
curl -X GET http://localhost:3000/api/notes/export/json \
  -H "Authorization: Bearer $TOKEN" > exported_notes.json

# 查看导出的文件
cat exported_notes.json | jq
```

**预期结果**：
- 创建了 `exported_notes.json` 文件
- 包含所有便签的数组
- 文件名格式：`notes_YYYY-MM-DD_timestamp.json`

### 4.2 导入便签（合并策略）✅

```bash
# 准备测试数据
cat > import_test.json <<'EOF'
[
  {
    "title": "导入测试1",
    "content": "这是导入的便签",
    "format": "text",
    "color": "#06b6d4",
    "isImportant": true,
    "tags": ["导入", "测试"]
  },
  {
    "title": "导入测试2",
    "content": "# Markdown导入\n\n测试内容",
    "format": "markdown",
    "color": "#ec4899",
    "isImportant": false
  }
]
EOF

# 导入（合并策略）
curl -X POST http://localhost:3000/api/notes/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"notes\": $(cat import_test.json), \"strategy\": \"merge\"}" | jq
```

**预期结果**：
```json
{
  "message": "成功导入 2 条便签",
  "count": 2,
  "strategy": "merge"
}
```

**验证**：
```bash
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
```

数量应该增加了2条

### 4.3 导入便签（覆盖策略）✅

```bash
curl -X POST http://localhost:3000/api/notes/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"notes\": $(cat import_test.json), \"strategy\": \"replace\"}" | jq
```

**预期结果**：
```json
{
  "message": "成功导入 2 条便签",
  "count": 2,
  "strategy": "replace"
}
```

**验证**：
```bash
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer $TOKEN" | jq 'length'
```

应该只有2条便签（之前的被清空）

### 4.4 导入验证（必填字段）✅

```bash
# 测试缺少内容的导入
curl -X POST http://localhost:3000/api/notes/import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "notes": [
      {"title": "标题", "content": ""}
    ],
    "strategy": "merge"
  }' | jq
```

**预期结果**：
```json
{
  "error": "第 1 条便签内容不能为空"
}
```

---

## 💾 测试5：自动备份

### 5.1 检查备份目录 ✅

```bash
# 查看备份目录
ls -lh server/data/backups/

# 手动触发备份（需要等到凌晨3点，或修改代码测试）
# 可以查看服务器日志，等待凌晨3点
```

**预期结果**：
- `server/data/backups/` 目录存在
- 凌晨3点后会自动创建备份文件
- 文件名格式：`backup_YYYY-MM-DD_timestamp.json`
- 只保留最近7个备份文件

---

## 🔔 测试6：提醒功能（可选）

如果配置了邮件或Telegram：

### 6.1 创建带提醒的便签 ✅

```bash
# 设置1分钟后的提醒
REMINDER_TIME=$(date -u -d '+1 minute' +"%Y-%m-%dT%H:%M:%S.000Z")

curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"title\": \"提醒测试\",
    \"content\": \"这是提醒测试\",
    \"reminderDate\": \"$REMINDER_TIME\",
    \"reminderMethods\": [\"email\"]
  }" | jq
```

**预期结果**：
- 1分钟后收到邮件提醒（如果配置了邮箱）
- 查看服务器日志，应该显示"Email reminder sent"

---

## ✅ 完整测试检查表

### 基础功能
- [ ] 服务器成功启动
- [ ] 自动创建admin账号
- [ ] 登录成功并获取token
- [ ] 防暴力登录生效（5次后锁定）
- [ ] 修改密码成功

### 便签增强
- [ ] 创建Markdown格式便签
- [ ] 创建带颜色的便签
- [ ] 创建重要标记便签
- [ ] 内容必填验证生效
- [ ] 获取所有便签
- [ ] 更新便签
- [ ] 切换完成状态

### 批量操作
- [ ] 一键完成所有便签

### 导入导出
- [ ] 导出便签为JSON
- [ ] 导入便签（合并策略）
- [ ] 导入便签（覆盖策略）
- [ ] 导入验证（必填字段检查）

### 系统功能
- [ ] 自动备份配置正确
- [ ] JWT认证正常工作
- [ ] 所有API返回正确格式

---

## 🐛 常见问题排查

### 问题1：无法连接服务器
```bash
# 检查服务器是否运行
ps aux | grep node

# 检查端口是否被占用
netstat -tlnp | grep 3000

# 查看服务器日志
# 在运行npm start的终端查看输出
```

### 问题2：登录失败
```bash
# 检查users.json是否存在
cat server/data/users.json | jq

# 检查admin账号是否创建
# 应该看到admin用户
```

### 问题3：API返回401
- token可能过期，重新登录获取新token
- 检查Authorization header格式：`Bearer YOUR_TOKEN`

### 问题4：导入失败
- 检查JSON格式是否正确
- 确认必填字段（title, content）不为空

---

## 📊 测试完成报告模板

```
========================================
后端功能测试报告
========================================
测试时间：2026-01-04
测试人：

✅ 通过的测试：
- 登录功能
- 防暴力登录
- 修改密码
- ... (列出所有通过的)

❌ 失败的测试：
- (如果有)

⚠️  需要注意：
- (如果有)

总体评估：
所有核心功能正常 / 部分功能有问题

========================================
```

---

测试完成后，请告诉我结果，我会继续完成前端代码！🚀
