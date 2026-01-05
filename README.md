# 智能待办管理系统

一个功能强大的待办事项管理系统，支持多用户、分类标签、优先级设置、截止日期管理，以及通过 Telegram 和邮件进行提醒。

## ✨ 功能特性

- 🔐 **用户系统**：支持用户注册和登录，每个用户拥有独立的待办数据
- 📝 **待办管理**：创建、编辑、删除待办事项
- 🏷️ **分类标签**：支持自定义分类和多标签
- 🎯 **优先级**：设置高/中/低优先级
- ⏰ **截止日期**：设置任务截止时间
- 🔔 **智能提醒**：
  - 📧 邮件提醒
  - 📱 Telegram Bot 提醒
  - ⏱️ 自动定时检查（每分钟）
- 🔍 **搜索过滤**：快速搜索和筛选待办事项
- 📊 **数据统计**：实时显示任务完成情况
- 🎨 **现代化UI**：响应式设计，支持移动端

## 🛠️ 技术栈

### 后端
- Node.js + Express
- JWT 身份验证
- JSON 文件存储
- node-cron 定时任务
- Nodemailer 邮件发送
- Telegram Bot API

### 前端
- 原生 HTML5/CSS3/JavaScript
- 响应式设计
- Font Awesome 图标

## 📦 安装部署

### 1. 环境要求

- Node.js 14+
- npm 或 yarn

### 2. 安装依赖

```bash
# 克隆或下载项目后，进入项目目录
cd ToDo_List

# 安装依赖
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器端口
PORT=3000

# JWT 密钥（生产环境请修改为复杂的随机字符串）
JWT_SECRET=your_strong_secret_key_here

# 邮件配置（以 Gmail 为例）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Telegram Bot 配置
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# 应用访问地址
APP_URL=http://localhost:3000
```

### 4. 邮件提醒配置（可选）

#### Gmail 配置示例：

1. 登录 Gmail 账户
2. 开启两步验证
3. 生成应用专用密码：https://myaccount.google.com/apppasswords
4. 将生成的密码填入 `EMAIL_PASS`

#### 其他邮箱服务商：

- **QQ邮箱**：
  ```
  EMAIL_HOST=smtp.qq.com
  EMAIL_PORT=587
  ```

- **163邮箱**：
  ```
  EMAIL_HOST=smtp.163.com
  EMAIL_PORT=465
  ```

### 5. Telegram Bot 配置（可选）

#### 创建 Telegram Bot：

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令创建新 bot
3. 按提示设置名称，获取 Bot Token
4. 将 Token 填入 `TELEGRAM_BOT_TOKEN`

#### 获取 Chat ID：

1. 在 Telegram 中搜索 `@userinfobot`
2. 向它发送任意消息
3. 它会返回你的 Chat ID
4. 将 Chat ID 填入用户注册时的 Telegram Chat ID 字段

**注意**：每个用户可以在注册时设置自己的 Telegram Chat ID，用于接收个人提醒。

### 6. 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务启动后访问：http://localhost:3000

## 🚀 部署到服务器

### 使用 PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server/server.js --name "todo-app"

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs todo-app

# 重启应用
pm2 restart todo-app

# 停止应用
pm2 stop todo-app
```

### 使用 Nginx 反向代理

创建 Nginx 配置文件 `/etc/nginx/sites-available/todo-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/todo-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL 证书（HTTPS）

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📖 使用指南

### 注册账户

1. 访问首页
2. 点击"注册"标签
3. 填写邮箱和密码
4. （可选）填写 Telegram Chat ID 以接收 Telegram 提醒
5. 点击注册

### 创建待办

1. 登录后点击"新建待办"
2. 填写标题（必填）
3. 填写详细内容、分类、标签等信息
4. 设置优先级
5. （可选）设置截止日期
6. （可选）设置提醒时间和提醒方式
7. 点击保存

### 提醒功能

- 系统每分钟检查一次待办提醒
- 到达提醒时间后，会根据用户选择的方式发送通知
- 邮件提醒：发送到用户注册邮箱
- Telegram 提醒：发送到用户设置的 Telegram Chat ID
- 提醒发送后会标记为"已发送"，不会重复发送

### 管理待办

- **完成**：点击待办卡片底部的"完成"按钮
- **编辑**：点击"编辑"按钮修改待办信息
- **删除**：点击"删除"按钮删除待办
- **搜索**：在搜索框输入关键词搜索
- **筛选**：点击筛选按钮（全部/进行中/已完成/高优先级）
- **排序**：使用排序下拉框（最新/最早/优先级/截止日期）

## 🔧 修改 API 地址

如果部署到服务器，需要修改前端 API 地址：

编辑 `public/js/auth.js` 和 `public/js/app.js`：

```javascript
// 修改第一行
const API_URL = 'http://your-domain.com/api';
// 或者使用 HTTPS
const API_URL = 'https://your-domain.com/api';
```

## 📁 项目结构

```
ToDo_List/
├── server/                 # 后端代码
│   ├── server.js          # 主服务器文件
│   ├── routes/            # 路由
│   │   ├── auth.js        # 认证路由
│   │   ├── notes.js       # 待办CRUD
│   │   └── reminders.js   # 提醒功能
│   ├── middleware/        # 中间件
│   │   └── auth.js        # JWT验证
│   ├── utils/             # 工具函数
│   │   ├── db.js          # 数据库操作
│   │   ├── telegram.js    # Telegram通知
│   │   └── email.js       # 邮件通知
│   └── data/              # 数据存储（自动生成）
│       ├── users.json     # 用户数据
│       └── notes.json     # 待办数据
├── public/                # 前端代码
│   ├── index.html         # 登录页
│   ├── app.html           # 主应用
│   ├── css/
│   │   └── style.css      # 样式
│   └── js/
│       ├── auth.js        # 认证逻辑
│       └── app.js         # 应用逻辑
├── package.json           # 依赖配置
├── .env.example           # 环境变量示例
├── .gitignore
└── README.md              # 说明文档
```

## 🔒 安全建议

1. **生产环境**：
   - 修改 `JWT_SECRET` 为强密码
   - 使用 HTTPS
   - 定期备份数据文件

2. **密码安全**：
   - 密码使用 bcrypt 加密存储
   - 最少 6 位字符

3. **数据备份**：
   ```bash
   # 定期备份 data 目录
   cp -r server/data server/data_backup_$(date +%Y%m%d)
   ```

## 📝 API 文档

### 认证相关

- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 待办相关（需要认证）

- `GET /api/notes` - 获取所有待办
- `GET /api/notes/:id` - 获取单个待办
- `POST /api/notes` - 创建待办
- `PUT /api/notes/:id` - 更新待办
- `DELETE /api/notes/:id` - 删除待办
- `PATCH /api/notes/:id/toggle` - 切换完成状态

## 🐛 常见问题

### 1. 邮件发送失败

- 检查邮箱配置是否正确
- 确认已开启应用专用密码
- 查看服务器日志：`pm2 logs todo-app`

### 2. Telegram 提醒不工作

- 确认 Bot Token 是否正确
- 确认用户的 Chat ID 是否正确
- 先向你的 Bot 发送一条消息激活对话

### 3. 无法访问服务

- 检查防火墙设置
- 确认端口 3000 是否开放
- 查看 PM2 状态：`pm2 status`

## 📄 License

MIT License

## 👨‍💻 作者

智能待办管理系统

## 🙏 致谢

感谢所有开源项目的贡献者！
