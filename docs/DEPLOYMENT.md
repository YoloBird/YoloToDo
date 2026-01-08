# 部署指南（Docker Compose）

适用于：WSL 本地开发与测试，服务器上线运行；有问题回 WSL 修复并推送，服务器更新时保证老数据不丢。

---

## 推荐部署方案

- 生产环境使用 Docker Compose
- 数据目录独立到仓库外（避免 `git pull`/`git clean` 误删数据）
- 更新流程：WSL 修复 -> 推送到 GitHub -> 服务器拉取并重建

---

## 关键目录与数据说明

- 业务数据默认在 `server/data/`：
  - `users.json`、`notes.json`、`ideas.json`、`diaries.json`、`goals.json`
- 自动备份：每天 03:00 生成 `server/data/backups/backup_*.json`（仅包含 notes/ideas/diaries/goals）
- 建议生产环境把数据目录放到仓库外，例如 `/opt/todo-data`，避免误删

---

## WSL 开发与验证（本地）

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 修改 JWT_SECRET

# 3. 开发模式
npm run dev

# 4. 生产模式本地验证
NODE_ENV=production npm start
```

---

## 服务器首次部署（Docker Compose）

### 1. 安装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# 重新登录后生效
```

### 2. 创建目录

```bash
sudo mkdir -p /opt/todo-app /opt/todo-data
sudo chown -R $USER:$USER /opt/todo-app /opt/todo-data
```

### 3. 克隆代码

```bash
git clone https://github.com/your-username/ToDo_List.git /opt/todo-app
cd /opt/todo-app
```

### 4. 配置 .env

```bash
cp .env.example .env

# 必须修改 JWT_SECRET
# 可选：设置 APP_URL、EMAIL_*、TELEGRAM_BOT_TOKEN
# 指定数据目录（推荐）
# TODO_DATA_DIR=/opt/todo-data
# 如需修改宿主机端口：
# HOST_PORT=3000
```

### 5. 启动服务

```bash
# Docker Compose v2
sudo docker compose up -d --build

# 如果是旧版：docker-compose up -d --build
```

### 6. 验证

```bash
sudo docker compose ps
sudo docker compose logs --tail=100 -f

# 访问
curl http://localhost:3000
```

默认账号：
- 用户名：`admin`
- 密码：`admin123`（首次登录请修改）

---

## 更新流程（WSL -> GitHub -> 服务器）

### 1. WSL 本地修复并推送

```bash
# 修复后测试
npm run dev

# 提交并推送
git add .
git commit -m "fix: ..."
git push
```

### 2. 服务器更新

```bash
cd /opt/todo-app

# 建议先备份数据
tar -czf "/tmp/todo-data_$(date +%Y%m%d_%H%M%S).tar.gz" /opt/todo-data

# 拉取代码
git pull

# 重建并重启
sudo docker compose up -d --build

# 查看日志
sudo docker compose logs --tail=100 -f
```

---

## 回滚方案

### 回滚代码

```bash
cd /opt/todo-app

git log --oneline -10
# 找到上一版本 commit

git checkout <commit-hash>

sudo docker compose up -d --build
```

### 回滚数据

```bash
# 停止服务
sudo docker compose stop

# 恢复数据
tar -xzf /tmp/todo-data_YYYYMMDD_HHMMSS.tar.gz -C /

# 重启服务
sudo docker compose up -d
```

---

## 数据备份与迁移

### 自动备份

- 每天 03:00 自动备份到 `server/data/backups/`
- 仅备份 notes/ideas/diaries/goals，不包含 users

### 手动备份（推荐）

```bash
# 备份完整数据（包含 users.json）
tar -czf /tmp/todo-data_full_$(date +%Y%m%d).tar.gz /opt/todo-data
```

### 迁移到新服务器

```bash
# 旧服务器打包
sudo tar -czf /tmp/todo-data_full.tar.gz /opt/todo-data

# 传输到新服务器
scp user@old-server:/tmp/todo-data_full.tar.gz /tmp/

# 新服务器解压
sudo mkdir -p /opt/todo-data
sudo tar -xzf /tmp/todo-data_full.tar.gz -C /
```

---

## 可选：Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 常见问题

### 1. 端口占用

```bash
sudo lsof -i :3000
```

### 2. JWT_SECRET 未设置

- 生产环境必须设置 `JWT_SECRET`
- 否则会使用默认值，存在安全风险

### 3. 数据权限问题

```bash
sudo chown -R $USER:$USER /opt/todo-data
sudo chmod -R 700 /opt/todo-data
```

---

## 部署检查清单

- [ ] 已修改默认密码（admin123）
- [ ] 已配置 JWT_SECRET（32 位以上随机字符串）
- [ ] 数据目录位于仓库外（推荐 /opt/todo-data）
- [ ] 更新前已备份数据
- [ ] 了解回滚流程
