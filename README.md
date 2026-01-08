# 智能便签系统

一套偏个人效率管理的轻量系统，覆盖待办、想法、日记、目标与时间回顾。

## 主要功能

- 待办清单：优先级/分类/标签/子任务/提醒/归档
- 想法记录：灵感快速记录与分类管理
- 日记：心情、天气、标签与时间轴回顾
- 长期目标：目标管理与记录沉淀
- 时光看板：日历视图与周/月统计
- 导入/导出：JSON 数据导入导出
- Markdown 支持与移动端适配

## 本地启动（WSL 推荐）

```bash
cp .env.example .env
# 修改 JWT_SECRET

npm install
npm run dev

# 或生产模式
npm start
```

访问：`http://localhost:3000`

默认账号：
- 用户名：`admin`
- 密码：`admin123`（首次登录请修改）

## 环境变量

模板见 `.env.example`，生产环境至少需要配置：
- `JWT_SECRET`
- `APP_URL`（邮件链接使用）
- 邮件与 Telegram 相关配置（可选）

Telegram 的 Chat ID 在系统设置中填写。

## 数据与备份

- 数据存储：`server/data/*.json`
- 自动备份：每天 03:00 写入 `server/data/backups/`

## 部署

推荐 Docker Compose 方案，详见：`docs/DEPLOYMENT.md`

## 文档

- 功能说明：`docs/FEATURES.md`
- API 说明：`docs/API.md`
- 需求文档：`docs/需求文档.md`

## License

MIT
