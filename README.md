# 家庭菜单协作平台 (Family Menu)

一个专为家庭设计的用餐协作网站。厨师创建菜单，家人选菜，厨师根据结果做菜并通知开饭。

## 🌐 快速部署

```bash
# Docker 一键启动
docker compose up -d

# 访问 http://localhost:8787
# 默认管理员：用户名 admin，密码 admin123456
```

## 功能特色

### 核心流程
1. **创建菜单** — 厨师创建菜单，添加候选菜品，邀请家人
2. **发布菜单** — 家人收到通知，在截止时间前选择想吃的菜
3. **汇总结果** — 厨师查看选择汇总，按热门度排序
4. **开始烹饪** — 厨师根据结果决定做什么菜
5. **完成通知** — 饭做好后通知全家人

### 菜品管理
- 所有家庭成员都可以添加菜品
- 支持 Markdown 富文本描述（食谱、做法等）
- 照片上传（JPG/PNG/WebP，最大 5MB）
- 标签、食材、烹饪方式分类
- **菜品变体** — 克隆菜品并修改（如不同口味版本）
- **拼音搜索** — 支持汉字、全拼、首字母搜索菜品

### 菜单选菜
- 搜索式菜品选择器（替代传统下拉列表）
- 显示每道菜的历史选择次数和上次使用时间
- 悬停查看菜品详情
- 支持多人协作编辑菜单

### 统计与偏好
- **口味偏好页面** — 查看每位家庭成员最爱的菜品
- 个人最爱排行（金银铜牌标识）
- 家庭成员偏好对比

### 其他功能
- 站内通知系统（菜单发布、开饭通知）
- PWA 支持（可安装到手机桌面）
- 移动端优先的响应式设计
- Toast 消息提示（替代原生 alert）
- 菜单打印功能（含食材汇总）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.5 + Vite 5.4 + Pinia 2.2 + Vue Router 4.4 |
| 后端 | Hono 4.6 on Node.js |
| 数据库 | SQLite (better-sqlite3) |
| 存储 | 本地文件系统 (图片) |
| 认证 | JWT (jose, HS256, 7天有效期) |
| 密码 | PBKDF2 (100000 次迭代) |
| 测试 | Vitest + Playwright |
| 部署 | Docker + GitHub Actions |

### 前端额外依赖
- `pinyin-pro` — 中文拼音转换
- `marked` — Markdown 渲染
- `dompurify` — HTML 安全净化
- `vite-plugin-pwa` — PWA 支持

## 项目结构

```
family-menu/
├── packages/
│   ├── shared/           # 共享类型定义
│   │   └── src/types/    # TypeScript 接口 (user, dish, menu, notification)
│   ├── worker/           # 后端 API (Node.js + Hono)
│   │   └── src/
│   │       ├── db/           # 数据库 schema 和 seed
│   │       ├── middleware/   # 认证中间件
│   │       ├── routes/       # API 路由
│   │       ├── services/     # 业务逻辑层
│   │       ├── utils/        # 密码哈希等工具
│   │       └── __tests__/    # 单元测试
│   └── web/              # 前端 (Vue 3 SPA)
│       └── src/
│           ├── api/          # HTTP 客户端
│           ├── components/   # 通用组件
│           ├── composables/  # Vue 组合式函数
│           ├── router/       # 路由配置
│           ├── stores/       # Pinia 状态管理
│           ├── utils/        # 拼音等工具函数
│           ├── views/        # 页面组件
│           └── __tests__/    # 单元测试
├── tsconfig.base.json    # 共享 TypeScript 配置
└── pnpm-workspace.yaml   # pnpm 工作空间配置
```

## 数据库设计

18 张表，核心关系：

```
users ──┬── menus (created_by)
        ├── menu_creators (多人协作)
        ├── menu_invitees (受邀家人)
        └── dish_selections (菜品选择)

dishes ──┬── dish_photos
         ├── dish_tags
         ├── dish_ingredients
         └── dish_cooking_methods

menus ── menu_dishes ── dish_selections

ingredients ── ingredient_categories
notifications
push_subscriptions
```

## 快速开始

### 前置条件
- Node.js 20+
- pnpm 10+

### 安装

```bash
# 克隆仓库
git clone <repo-url>
cd family-menu

# 安装依赖
pnpm install
```

### 本地开发

```bash
# 1. 启动后端 (端口 8787，自动初始化数据库)
pnpm dev:worker

# 2. 启动前端 (端口 5173，自动代理 /api 到后端)
pnpm dev:web
```

### 默认账号
- 管理员：用户名 `admin`，密码 `admin123456`

### 运行测试

```bash
# 后端单元测试（107 个）
pnpm --filter @family-menu/worker test

# 前端单元测试（24 个）
pnpm --filter @family-menu/web test

# E2E 测试（14 个，需先启动本地开发服务器）
pnpm --filter @family-menu/web test:e2e

# 监听模式
pnpm --filter @family-menu/worker test:watch
```

### 类型检查

```bash
# 后端
pnpm --filter @family-menu/worker typecheck

# 前端
pnpm --filter @family-menu/web typecheck
```

## API 概览

所有 API 均以 `/api/v1` 为前缀，需 JWT 认证（除登录/注册外）。

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/login | 登录（支持用户名或邮箱） |
| POST | /auth/register | 注册 |
| GET | /auth/me | 获取当前用户信息 |

### 菜品
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /dishes | 菜品列表（支持关键词/标签/食材/烹饪方式筛选） |
| GET | /dishes/search | 菜单创建用搜索（含使用统计） |
| GET | /dishes/favorites | 当前用户最爱菜品 |
| GET | /dishes/favorites/all | 全家人最爱菜品 |
| POST | /dishes | 创建菜品 |
| GET | /dishes/:id | 菜品详情 |
| PUT | /dishes/:id | 更新菜品 |
| DELETE | /dishes/:id | 删除菜品 |
| POST | /dishes/:id/clone | 克隆菜品（创建变体） |
| POST | /dishes/:id/photos | 上传照片 |

### 菜单
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /menus | 菜单列表 |
| POST | /menus | 创建菜单 |
| GET | /menus/:id | 菜单详情 |
| PUT | /menus/:id | 更新菜单 |
| DELETE | /menus/:id | 删除菜单 |
| POST | /menus/:id/publish | 发布菜单 |
| POST | /menus/:id/close-selection | 关闭选菜 |
| POST | /menus/:id/start-cooking | 开始烹饪 |
| POST | /menus/:id/complete | 完成 |
| PUT | /menus/:id/selections | 提交选菜 |
| GET | /menus/:id/summary | 选菜汇总 |
| GET | /menus/:id/print | 打印数据 |

### 通知
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /notifications | 通知列表 |
| GET | /notifications/unread-count | 未读数量 |
| PUT | /notifications/:id/read | 标记已读 |
| PUT | /notifications/read-all | 全部已读 |

## 菜单状态流转

```
draft → published → selection_closed → cooking → completed
  │         ↑
  └─────────┘ (可编辑)
```

- **draft**: 可编辑菜单内容、添加/删除菜品、管理邀请人
- **published**: 受邀家人可以选菜，截止时间后自动关闭
- **selection_closed**: 厨师查看选择结果，准备开始做菜
- **cooking**: 正在烹饪中
- **completed**: 做好了，通知全家开饭

## 部署

### Docker 部署（推荐）

```bash
# 1. 构建并启动
docker compose up -d

# 2. 自定义环境变量
docker compose up -d \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e ADMIN_PASSWORD=your-secure-password \
  -e CORS_ORIGIN=https://your-domain.com
```

数据持久化在 Docker volume `app-data` 中（SQLite 数据库 + 上传的照片）。

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `8787` | 服务端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产环境必须修改） |
| `CORS_ORIGIN` | `*` | 允许的前端域名 |
| `ADMIN_PASSWORD` | `admin123456` | 首次初始化时的管理员密码 |
| `DB_PATH` | `./data/family-menu.db` | SQLite 数据库文件路径 |
| `PHOTOS_PATH` | `./data/photos` | 照片存储目录 |

### GitHub Actions CI/CD

项目包含 `.github/workflows/docker.yml`，会在推送到 `main` 分支时自动：
1. 运行所有测试
2. 构建 Docker 镜像
3. 推送到 GitHub Container Registry (ghcr.io)

```bash
# 拉取并运行最新镜像
docker pull ghcr.io/<your-username>/codextest:main
docker run -d -p 8787:8787 -v app-data:/app/data \
  -e JWT_SECRET=your-secret \
  ghcr.io/<your-username>/codextest:main
```

### 生产环境检查清单

- [ ] `JWT_SECRET` 已设置为安全的随机字符串
- [ ] `CORS_ORIGIN` 已设置为前端实际域名
- [ ] `ADMIN_PASSWORD` 已设置为安全密码
- [ ] 管理员登录后已修改默认密码
- [ ] 数据目录已配置持久化存储

## 测试

### 单元测试（131 个）

```bash
# 后端（107 个测试：服务层 55 + 路由层 11 + 管理员路由 27 + 工具函数 14）
pnpm --filter @family-menu/worker test

# 前端（24 个测试：Toast 7 + Auth Store 7 + Component 3 + Notification Store 7）
pnpm --filter @family-menu/web test
```

### E2E 测试（14 个）

```bash
# 需要先启动本地开发服务器
pnpm --filter @family-menu/web test:e2e
```

### 类型检查

```bash
pnpm --filter @family-menu/worker typecheck
pnpm --filter @family-menu/web typecheck
```

## 许可证

私有项目，仅供家庭内部使用。
