# 吃饭 ChiFan — Cloudflare 部署指南

## 架构概览

| 组件 | Cloudflare 服务 | 说明 |
|------|----------------|------|
| 前端 | Cloudflare Pages | Vue 3 SPA (Vite 构建) |
| 后端 API | Cloudflare Workers | Hono.js API |
| 数据库 | Cloudflare D1 (SQLite) | 结构化数据存储 |
| 文件存储 | Cloudflare R2 | 菜品照片存储 |

## 前置条件

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

## 步骤 1: 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create chifan-db

# 记下返回的 database_id，填入 packages/worker/wrangler.toml
```

将输出的 `database_id` 填入 `packages/worker/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "chifan-db"
database_id = "<YOUR_DATABASE_ID>"
```

## 步骤 2: 初始化数据库

```bash
cd packages/worker

# 应用 schema
wrangler d1 execute chifan-db --file=migrations/0001_initial_schema.sql

# 应用种子数据
wrangler d1 execute chifan-db --file=src/db/seed.sql
```

## 步骤 3: 创建 R2 存储桶

```bash
wrangler r2 bucket create chifan-photos
```

## 步骤 4: 配置 Secrets

```bash
cd packages/worker

# 设置 JWT 密钥（使用强随机字符串）
wrangler secret put JWT_SECRET

# 设置管理员初始密码（可选，用于初始化脚本）
wrangler secret put ADMIN_PASSWORD
```

## 步骤 5: 部署后端 Workers

```bash
cd packages/worker

# 本地开发
wrangler dev

# 部署到生产
wrangler deploy
```

## 步骤 6: 部署前端 Pages

### 方式 A: Cloudflare Pages (推荐)

在 Cloudflare Dashboard 中创建 Pages 项目并连接 GitHub 仓库：

| 设置项 | 值 |
|--------|-----|
| 构建命令 | `pnpm build` |
| 构建输出目录 | `packages/web/dist` |
| Root Directory | `/` |
| Node 版本 | `20` |

环境变量（构建时）:
- 无需额外设置，API URL 通过 `/api/v1` 相对路径访问

### 方式 B: 手动部署

```bash
# 构建前端
pnpm build

# 部署到 Pages
wrangler pages deploy packages/web/dist --project-name=chifan
```

## 步骤 7: 配置路由（可选）

如果前端和后端使用不同子域名，需在 `wrangler.toml` 中配置 CORS：

```toml
[env.production.vars]
CORS_ORIGIN = "https://chifan.pages.dev"
```

如果使用自定义域名，配置 Workers 路由：

```toml
routes = [{ pattern = "api.chifan.com/*", zone_name = "chifan.com" }]
```

## 步骤 8: 初始化管理员密码

部署完成后，seed.sql 中的管理员密码哈希是占位符。需要通过 D1 控制台或脚本更新：

```bash
# 通过 wrangler d1 execute 更新（使用实际部署的 Worker 的密码哈希端点或手动计算）
# 或者直接通过应用 API 调用管理员注册后台来设置
```

## 项目结构

```
packages/worker/
├── wrangler.toml          # Cloudflare Workers 配置
├── src/
│   ├── worker.ts          # Workers 入口点 (export default { fetch })
│   ├── server.ts          # Node.js 入口点 (Docker 部署)
│   ├── index.ts           # Hono 应用（共享）
│   └── env.ts             # D1/R2 类型定义
├── migrations/
│   └── 0001_initial_schema.sql  # D1 迁移文件
```

## Docker vs Cloudflare

本项目支持两种部署方式：

| 特性 | Docker | Cloudflare |
|------|--------|------------|
| 入口文件 | `server.ts` | `worker.ts` |
| 数据库 | better-sqlite3 本地文件 | D1 (SQLite) |
| 文件存储 | 本地文件系统 | R2 |
| 适用场景 | 自托管/VPS | 无服务器/全球化 |

两种部署共享相同的 Hono 路由 (`index.ts`) 和业务逻辑，仅入口点和适配器不同。
