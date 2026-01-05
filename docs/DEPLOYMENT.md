# 部署指南

本文档提供将智能便签系统部署到生产服务器的完整指南。

## 目录

- [环境准备](#环境准备)
- [方式一：直接部署](#方式一直接部署)
- [方式二：PM2 部署](#方式二pm2-部署)
- [方式三：Docker 部署](#方式三docker-部署)
- [方式四：Docker Compose](#方式四docker-compose)
- [Nginx 反向代理](#nginx-反向代理)
- [HTTPS 配置](#https-配置)
- [数据备份与恢复](#数据备份与恢复)
- [监控与日志](#监控与日志)
- [常见问题](#常见问题)

---

## 环境准备

### 系统要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ / Debian 10+ | Ubuntu 22.04 LTS |
| CPU | 1 核 | 2 核 |
| 内存 | 512MB | 1GB |
| 磁盘 | 1GB | 10GB |
| Node.js | 18.x | 20.x LTS |

### 安装 Node.js

**Ubuntu/Debian:**
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
```

---

## 方式一：直接部署

最简单的部署方式，适合测试环境。

```bash
# 1. 克隆代码
git clone <your-repo-url> /opt/todo-app
cd /opt/todo-app

# 2. 安装依赖
npm install --production

# 3. 配置环境变量
cat > .env << 'EOF'
PORT=3000
JWT_SECRET=your_very_secure_random_string_here_at_least_32_chars
NODE_ENV=production
EOF

# 4. 启动服务
npm start
```

> **注意**: 直接启动的服务在终端关闭后会停止，不推荐用于生产环境。

---

## 方式二：PM2 部署

推荐的生产部署方式，支持进程管理、自动重启、日志管理。

### 安装 PM2

```bash
npm install -g pm2
```

### 部署步骤

```bash
# 1. 进入项目目录
cd /opt/todo-app

# 2. 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'todo-app',
    script: 'server/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
EOF

# 3. 创建日志目录
mkdir -p logs

# 4. 启动应用
pm2 start ecosystem.config.js

# 5. 设置开机自启
pm2 startup
pm2 save

# 6. 查看状态
pm2 status
pm2 logs todo-app
```

### PM2 常用命令

```bash
# 查看所有进程
pm2 list

# 查看详细信息
pm2 show todo-app

# 查看日志
pm2 logs todo-app

# 重启应用
pm2 restart todo-app

# 停止应用
pm2 stop todo-app

# 删除应用
pm2 delete todo-app

# 监控面板
pm2 monit
```

---

## 方式三：Docker 部署

### 创建 Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建数据目录
RUN mkdir -p server/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server/server.js"]
```

### 构建和运行

```bash
# 构建镜像
docker build -t todo-app:latest .

# 运行容器
docker run -d \
  --name todo-app \
  -p 3000:3000 \
  -v $(pwd)/data:/app/server/data \
  -e JWT_SECRET=your_secret_here \
  --restart unless-stopped \
  todo-app:latest

# 查看日志
docker logs -f todo-app
```

---

## 方式四：Docker Compose

### 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  todo-app:
    build: .
    container_name: todo-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./server/data:/app/server/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET:-change_this_secret}
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 运行

```bash
# 启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## Nginx 反向代理

推荐使用 Nginx 作为反向代理，提供静态文件缓存、SSL 终端等功能。

### 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# CentOS
sudo yum install -y nginx
```

### 配置文件

创建 `/etc/nginx/sites-available/todo-app`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/todo-app.access.log;
    error_log /var/log/nginx/todo-app.error.log;

    # 静态文件缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API 和其他请求
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/todo-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

---

## HTTPS 配置

使用 Let's Encrypt 免费证书。

### 安装 Certbot

```bash
# Ubuntu/Debian
sudo apt install -y certbot python3-certbot-nginx

# CentOS
sudo yum install -y certbot python3-certbot-nginx
```

### 获取证书

```bash
# 自动配置
sudo certbot --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 自动续期

Certbot 会自动添加定时任务，每天检查证书是否需要续期。

```bash
# 查看定时任务
sudo systemctl list-timers | grep certbot
```

---

## 数据备份与恢复

### 自动备份

系统已内置自动备份功能：
- 每天凌晨 3:00 自动备份
- 保留最近 7 天的备份
- 备份位置：`server/data/backups/`

### 手动备份

```bash
# 创建备份
tar -czvf backup_$(date +%Y%m%d_%H%M%S).tar.gz server/data/

# 复制到远程
scp backup_*.tar.gz user@backup-server:/path/to/backups/
```

### 恢复数据

```bash
# 停止服务
pm2 stop todo-app

# 解压备份
tar -xzvf backup_YYYYMMDD_HHMMSS.tar.gz

# 启动服务
pm2 start todo-app
```

### 定时远程备份脚本

创建 `/opt/todo-app/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/opt/todo-app/server/data"
REMOTE_USER="backup"
REMOTE_HOST="backup-server.com"
REMOTE_PATH="/backups/todo-app"
DATE=$(date +%Y%m%d)

# 创建备份
tar -czvf /tmp/todo-backup-$DATE.tar.gz $BACKUP_DIR

# 上传到远程服务器
rsync -avz /tmp/todo-backup-$DATE.tar.gz $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

# 清理本地临时文件
rm /tmp/todo-backup-$DATE.tar.gz

# 删除超过30天的远程备份
ssh $REMOTE_USER@$REMOTE_HOST "find $REMOTE_PATH -name '*.tar.gz' -mtime +30 -delete"
```

添加到 crontab：
```bash
# 每天凌晨 4 点执行
0 4 * * * /opt/todo-app/backup.sh
```

---

## 监控与日志

### PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs todo-app --lines 100

# 清空日志
pm2 flush
```

### 系统日志

```bash
# 查看 Nginx 访问日志
tail -f /var/log/nginx/todo-app.access.log

# 查看 Nginx 错误日志
tail -f /var/log/nginx/todo-app.error.log
```

### 健康检查

```bash
# 检查服务是否运行
curl -s http://localhost:3000 | head -20

# 检查 API
curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀掉进程
kill -9 <PID>
```

### 2. 权限问题

```bash
# 确保数据目录可写
chmod -R 755 server/data
chown -R $USER:$USER server/data
```

### 3. 内存不足

```bash
# 创建 swap 文件
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. Node.js 版本问题

```bash
# 使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

### 5. 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 生产环境检查清单

部署前请确认：

- [ ] 已修改默认管理员密码
- [ ] 已设置强 JWT_SECRET
- [ ] 已配置 HTTPS
- [ ] 已配置防火墙
- [ ] 已设置自动备份
- [ ] 已配置开机自启
- [ ] 已测试所有功能正常
- [ ] 已配置日志轮转
- [ ] 已记录服务器访问凭证
