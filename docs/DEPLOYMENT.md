# 部署指南

智能便签系统部署完整指南，包含首次部署和后续更新流程。

## 目录

- [快速开始](#快速开始)
- [适用场景与推荐流程](#适用场景与推荐流程)
  - [WSL 本地开发 + 服务器生产（推荐）](#wsl-本地开发--服务器生产推荐)
  - [数据安全策略（避免更新丢失）](#数据安全策略避免更新丢失)
  - [无调试条件下的排障与回滚](#无调试条件下的排障与回滚)
  - [常见场景选择](#常见场景选择)
- [首次部署](#首次部署)
  - [方式一：PM2 部署（推荐）](#方式一pm2-部署推荐)
  - [方式二：Docker 部署](#方式二docker-部署)
- [更新部署](#更新部署)
  - [PM2 更新流程](#pm2-更新流程)
  - [Docker 更新流程](#docker-更新流程)
- [Nginx 反向代理](#nginx-反向代理)
- [HTTPS 配置](#https-配置)
- [数据备份与恢复](#数据备份与恢复)
- [常见问题](#常见问题)
- [运维速查表](#运维速查表)

---

## 快速开始

### 系统要求

| 项目 | 最低要求 | 说明 |
|------|----------|------|
| 操作系统 | Ubuntu 20.04+ / Debian 10+ | 推荐 Ubuntu 22.04 |
| CPU | 1 核 | 2H2G 配置完全够用 |
| 内存 | 512MB | JSON 存储内存占用极小 |
| Node.js | 18.x+ | 推荐 20.x LTS |

### 安装 Node.js（Ubuntu/Debian）

```bash
# 使用 NodeSource 仓库安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 安装 Git

```bash
sudo apt-get install -y git
```

---

## 适用场景与推荐流程

本节针对：你在 WSL 本地开发/调试，通过本地验证后再部署到服务器；服务器不具备调试条件，需要可回滚、可更新、数据不丢失。

### WSL 本地开发 + 服务器生产（推荐）

1. 本地开发与预发布测试（WSL）
   - Node 版本尽量与服务器一致（建议 20.x LTS）
   - 本地维护 `.env`，不要提交到 git
   - 开发使用 `npm run dev`
   - 预发布验证使用 `NODE_ENV=production npm start`，并 `curl http://localhost:3000`
2. 生成可部署版本（选一种）
   - 方式 A：Git 发布（推荐）
     - 本地提交并 `git push`
     - 服务器执行 `git pull` + 安装依赖 + 重启
   - 方式 B：离线包发布（服务器无 git/无公网）
     - 本地打包（排除数据与配置）：
       `tar -czf todo-app-YYYYMMDD.tar.gz --exclude=node_modules --exclude=.env --exclude=server/data .`
     - 上传到服务器并解压到 `/opt/todo-app`
3. 服务器更新与验证
   - 更新前先备份 `server/data`
   - 更新后检查 `pm2 status` / `docker-compose ps`、`pm2 logs` / `docker-compose logs`
   - `curl http://localhost:3000` 进行健康检查

### 数据安全策略（避免更新丢失）

- 业务数据在 `server/data/*.json`，已在 `.gitignore` 中排除，正常更新不会覆盖
- 不要执行 `git clean -fd` 或删除 `/opt/todo-app/server/data`
- Docker 部署务必挂载持久化目录：`./server/data:/app/server/data`
- 建议同时备份 `.env` 与 `server/data`，并保留至少 7 天

### 无调试条件下的排障与回滚

- 先收集日志：`pm2 logs todo-app --lines 200` 或 `docker-compose logs --tail=200`
- 记录版本信息：`git rev-parse HEAD`、`node --version`
- 将日志和 `server/data` 备份拉回本地复现，修复后再发布
- 快速回滚：`git checkout <last-good>` + `pm2 restart todo-app`
- 数据回滚：解压备份覆盖 `server/data` 后重启服务

### 常见场景选择

- 仅本地/内网使用：直接 PM2 或 `npm start`，可不配置 Nginx/HTTPS
- 有公网域名：建议 Nginx 反代 + HTTPS
- 服务器无 Docker：用 PM2
- 想要隔离与可移植：用 Docker Compose

---

## 首次部署

### 方式一：PM2 部署（推荐）

PM2 是 Node.js 生产环境进程管理器，支持自动重启、日志管理、开机自启。

#### 1. 安装 PM2

```bash
sudo npm install -g pm2
```

#### 2. 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /opt/todo-app
sudo chown $USER:$USER /opt/todo-app

# 克隆代码（替换为你的仓库地址）
git clone https://github.com/your-username/ToDo_List.git /opt/todo-app
cd /opt/todo-app
```

#### 3. 安装依赖

```bash
npm install --production
```

#### 4. 配置环境变量

```bash
cat > .env << 'EOF'
# 服务配置
PORT=3000
NODE_ENV=production

# 安全配置（必须修改！）
JWT_SECRET=这里改成一个很长的随机字符串至少32位

# 可选：邮件提醒
# EMAIL_HOST=smtp.qq.com
# EMAIL_PORT=465
# EMAIL_USER=your_email@qq.com
# EMAIL_PASS=your_smtp_password

# 可选：Telegram 提醒
# TELEGRAM_BOT_TOKEN=your_bot_token
EOF
```

#### 5. 创建 PM2 配置

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'todo-app',
    script: 'server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
EOF

# 创建日志目录
mkdir -p logs
```

#### 6. 启动服务

```bash
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs todo-app
```

#### 7. 设置开机自启

```bash
pm2 startup
# 按提示执行输出的命令

pm2 save
```

#### 8. 验证部署

```bash
# 检查服务是否运行
curl http://localhost:3000

# 应该看到 HTML 内容
```

---

### 方式二：Docker 部署

适合有 Docker 环境的服务器。

#### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录后生效
```

#### 2. 克隆代码

```bash
git clone https://github.com/your-username/ToDo_List.git /opt/todo-app
cd /opt/todo-app
```

#### 3. 配置环境变量

```bash
cat > .env << 'EOF'
JWT_SECRET=这里改成一个很长的随机字符串至少32位
EOF
```

#### 4. 启动服务

```bash
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 更新部署

当你修改了代码需要重新部署时，按以下流程操作。

### PM2 更新流程

#### 标准更新流程

```bash
# 1. 进入项目目录
cd /opt/todo-app

# 2. 备份数据（推荐）
tar -czf "/tmp/backup_$(date +%Y%m%d_%H%M%S).tar.gz" server/data/

# 3. 拉取最新代码
git pull origin main

# 4. 安装可能新增的依赖（如果 package.json 有变化）
npm install --production

# 5. 重启服务
pm2 restart todo-app

# 6. 查看日志确认正常
pm2 logs todo-app --lines 50
```

#### 一键更新脚本

> 注意：脚本使用 `git reset --hard origin/main`，会丢弃服务器上对仓库文件的改动，适用于服务器仅部署、无本地修改的场景。

创建更新脚本 `/opt/todo-app/update.sh`：

```bash
#!/bin/bash
set -e

APP_DIR="/opt/todo-app"
APP_NAME="todo-app"

echo "========================================="
echo "开始更新 Todo App"
echo "========================================="

cd $APP_DIR

# 备份数据
echo "[1/5] 备份数据..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "/tmp/$BACKUP_FILE" server/data/
echo "      备份已保存到 /tmp/$BACKUP_FILE"

# 拉取代码
echo "[2/5] 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 安装依赖
echo "[3/5] 安装依赖..."
npm install --production

# 重启服务
echo "[4/5] 重启服务..."
pm2 restart $APP_NAME

# 等待启动
sleep 3

# 检查状态
echo "[5/5] 检查服务状态..."
pm2 status $APP_NAME

echo ""
echo "========================================="
echo "更新完成！"
echo "========================================="
echo "查看日志: pm2 logs $APP_NAME"
echo "回滚备份: tar -xzf /tmp/$BACKUP_FILE -C /"
```

设置权限并使用：

```bash
chmod +x /opt/todo-app/update.sh

# 以后更新只需运行
/opt/todo-app/update.sh
```

#### 回滚到之前版本

```bash
cd /opt/todo-app

# 查看提交历史
git log --oneline -10

# 回滚到指定版本
git checkout <commit-hash>

# 重启服务
pm2 restart todo-app
```

---

### Docker 更新流程

#### 标准更新流程

```bash
cd /opt/todo-app

# 1. 备份数据（推荐）
tar -czf "/tmp/backup_$(date +%Y%m%d_%H%M%S).tar.gz" server/data/

# 2. 拉取最新代码
git pull origin main

# 3. 重新构建镜像
docker-compose build

# 4. 重启容器
docker-compose up -d

# 5. 查看日志
docker-compose logs -f
```

#### 一键更新脚本

创建 `/opt/todo-app/docker-update.sh`：

```bash
#!/bin/bash
set -e

APP_DIR="/opt/todo-app"

echo "开始更新..."

cd $APP_DIR

# 备份数据
echo "[1/4] 备份数据..."
tar -czf "/tmp/backup_$(date +%Y%m%d_%H%M%S).tar.gz" server/data/

# 拉取代码
echo "[2/4] 拉取代码..."
git pull origin main

# 重建并重启
echo "[3/4] 重建镜像..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 清理旧镜像
echo "[4/4] 清理旧镜像..."
docker image prune -f

echo "更新完成！"
docker-compose logs --tail=20
```

---

## Nginx 反向代理

### 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 创建配置

```bash
sudo cat > /etc/nginx/sites-available/todo-app << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # 改成你的域名或 IP

    # 日志
    access_log /var/log/nginx/todo-app.access.log;
    error_log /var/log/nginx/todo-app.error.log;

    # 静态文件缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # 所有请求
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/todo-app /etc/nginx/sites-enabled/

# 删除默认站点（可选）
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
```

---

## HTTPS 配置

使用 Let's Encrypt 免费证书。

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

---

## 数据备份与恢复

### 自动备份

系统已内置自动备份：
- 每天凌晨 3:00 自动备份
- 保留最近 7 天
- 位置：`server/data/backups/`

### 手动备份

```bash
cd /opt/todo-app
tar -czf ~/todo-backup-$(date +%Y%m%d).tar.gz server/data/
```

### 恢复数据

```bash
# 停止服务
pm2 stop todo-app

# 恢复数据
tar -xzf ~/todo-backup-YYYYMMDD.tar.gz -C /opt/todo-app/

# 启动服务
pm2 start todo-app
```

### 同步到本地

```bash
# 从服务器下载备份（在本地执行）
scp user@server:/opt/todo-app/server/data/backups/*.json ./backups/
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查找占用进程
lsof -i :3000

# 结束进程
kill -9 <PID>
```

### 2. 权限问题

```bash
# 确保数据目录可写
chmod -R 755 /opt/todo-app/server/data
chown -R $USER:$USER /opt/todo-app/server/data
```

### 3. 服务无法启动

```bash
# 查看详细日志
pm2 logs todo-app --lines 100

# 检查 Node.js 版本
node --version
```

### 4. 更新后功能异常

```bash
# 清除 npm 缓存重新安装
rm -rf node_modules
npm install --production
pm2 restart todo-app
```

### 5. 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

## 运维速查表

### PM2 常用命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看所有进程状态 |
| `pm2 logs todo-app` | 查看日志 |
| `pm2 logs todo-app --lines 100` | 查看最后100行日志 |
| `pm2 restart todo-app` | 重启服务 |
| `pm2 stop todo-app` | 停止服务 |
| `pm2 start todo-app` | 启动服务 |
| `pm2 reload todo-app` | 平滑重载（零停机） |
| `pm2 monit` | 实时监控 |
| `pm2 flush` | 清空日志 |

### Docker 常用命令

| 命令 | 说明 |
|------|------|
| `docker-compose up -d` | 后台启动 |
| `docker-compose down` | 停止并删除容器 |
| `docker-compose logs -f` | 查看日志 |
| `docker-compose restart` | 重启 |
| `docker-compose build` | 重新构建 |
| `docker-compose ps` | 查看状态 |

### 日常运维流程

```bash
# 每日检查
pm2 status
pm2 logs todo-app --lines 20

# 更新部署
/opt/todo-app/update.sh

# 查看磁盘占用
du -sh /opt/todo-app/server/data/

# 查看备份
ls -la /opt/todo-app/server/data/backups/
```

---

## 生产环境检查清单

部署前请确认：

- [ ] 已修改默认管理员密码（admin123）
- [ ] 已设置强 JWT_SECRET（32位以上随机字符串）
- [ ] 已配置防火墙
- [ ] PM2 已设置开机自启（`pm2 startup && pm2 save`）
- [ ] 已测试更新流程可用
- [ ] 已记录服务器访问凭证
- [ ] （可选）已配置 HTTPS
- [ ] （可选）已配置邮件/Telegram 提醒
