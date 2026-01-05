# 快速开始指南

## 🚀 立即启动

### 1. 最简单的启动方式（本地测试）

项目已经配置好了基础环境，可以直接启动：

```bash
# 启动服务器
npm start
```

然后在浏览器访问：http://localhost:3000

### 2. 开发模式（自动重启）

```bash
# 安装 nodemon（如果还没安装）
npm install -g nodemon

# 以开发模式启动
npm run dev
```

## 📝 第一次使用

1. **访问首页**：http://localhost:3000
2. **注册账户**：
   - 点击"注册"标签
   - 输入邮箱和密码（密码至少6位）
   - 点击注册按钮
3. **登录成功后**，会自动跳转到待办管理页面
4. **创建第一个待办**：
   - 点击"新建待办"按钮
   - 填写标题和其他信息
   - 点击保存

## ⚙️ 配置提醒功能（可选）

### 邮件提醒

编辑 `.env` 文件，添加邮箱配置：

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Gmail 用户**：
1. 访问：https://myaccount.google.com/apppasswords
2. 生成应用专用密码
3. 将密码填入 `EMAIL_PASS`

### Telegram 提醒

1. **创建 Bot**：
   - 在 Telegram 搜索 `@BotFather`
   - 发送 `/newbot` 创建机器人
   - 获取 Bot Token

2. **获取 Chat ID**：
   - 在 Telegram 搜索 `@userinfobot`
   - 发送任意消息获取你的 Chat ID

3. **配置环境变量**：
   ```env
   TELEGRAM_BOT_TOKEN=你的机器人Token
   ```

4. **设置用户 Chat ID**：
   - 注册时填写 Telegram Chat ID 字段
   - 或者重新注册账户

## 🌐 部署到服务器

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server/server.js --name todo-app

# 开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs todo-app
```

### 修改 API 地址

部署到服务器后，需要修改前端 API 地址：

编辑以下文件：
- `public/js/auth.js` 第1行
- `public/js/app.js` 第1行

将 `http://localhost:3000/api` 改为你的服务器地址：
```javascript
const API_URL = 'http://your-server.com/api';
```

## 🔧 常用命令

```bash
# 查看服务器状态
pm2 status

# 重启服务
pm2 restart todo-app

# 停止服务
pm2 stop todo-app

# 查看日志
pm2 logs todo-app

# 清空日志
pm2 flush

# 备份数据
cp -r server/data server/data_backup_$(date +%Y%m%d)
```

## 📂 数据文件位置

用户和待办数据存储在：
- `server/data/users.json` - 用户数据
- `server/data/notes.json` - 待办数据

**重要**：定期备份这两个文件！

## 🆘 遇到问题？

1. **端口被占用**：
   - 修改 `.env` 中的 `PORT=3000` 为其他端口

2. **无法访问**：
   - 检查防火墙设置
   - 确认服务器已启动：`pm2 status`

3. **邮件发送失败**：
   - 检查 `.env` 中的邮箱配置
   - 查看日志：`pm2 logs todo-app`

4. **Telegram 提醒不工作**：
   - 确认 Bot Token 正确
   - 确认用户设置了正确的 Chat ID
   - 先向你的 Bot 发送一条消息

## 💡 使用技巧

1. **搜索**：在搜索框输入关键词，可以搜索标题、内容、分类、标签
2. **筛选**：使用筛选按钮快速查看特定类型的待办
3. **排序**：按创建时间、优先级、截止日期排序
4. **优先级**：用不同颜色标记（红色=高，黄色=中，绿色=低）
5. **提醒**：可以同时选择邮件和 Telegram 提醒
6. **标签**：用逗号分隔多个标签，如：工作,紧急,本周

## 📊 项目统计

页面顶部实时显示：
- 总计：所有待办数量
- 已完成：已完成的待办数量
- 待办：未完成的待办数量

祝你使用愉快！
