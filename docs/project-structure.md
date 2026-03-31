# 项目结构设计

> 最后更新：2026-03-31，与实际代码结构保持一致

```
codextest/
├── .github/
│   ├── instructions/
│   │   └── copilot.instructions.md
│   └── workflows/
│       └── docker.yml              # CI/CD: test → build → push to GHCR
│
├── docs/                           # 设计文档
│   ├── database-schema.md
│   ├── api-design.md
│   ├── ui-design.md
│   └── project-structure.md        # 本文件
│
├── packages/                       # pnpm Monorepo
│   ├── shared/                     # 前后端共享类型和常量
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── user.ts
│   │   │   │   ├── dish.ts
│   │   │   │   ├── menu.ts
│   │   │   │   ├── notification.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   │   └── index.ts        # MenuStatus, MealType, NotificationType 等枚举
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                     # 后端 API (Node.js + Hono.js)
│   │   ├── src/
│   │   │   ├── index.ts            # Hono app 入口（CORS、路由注册、错误处理、限流）
│   │   │   ├── server.ts           # Node.js 服务入口（DB 初始化、静态文件、管理员创建）
│   │   │   ├── env.ts              # Env 接口定义（D1Database, R2Bucket 兼容类型）
│   │   │   ├── adapters/
│   │   │   │   ├── sqlite.ts       # D1Database 兼容的 better-sqlite3 适配器
│   │   │   │   └── storage.ts      # R2Bucket 兼容的本地文件系统适配器
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts         # JWT 认证 + 管理员中间件
│   │   │   │   └── rate-limit.ts   # 速率限制中间件（内存存储）
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts         # 认证路由（登录/注册/获取用户）
│   │   │   │   ├── users.ts        # 用户管理路由
│   │   │   │   ├── dishes.ts       # 菜品 CRUD + 照片 + 克隆 + 搜索 + 收藏
│   │   │   │   ├── ingredients.ts
│   │   │   │   ├── ingredient-categories.ts
│   │   │   │   ├── cooking-methods.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── menus.ts        # 菜单全生命周期 + 过敏原警告
│   │   │   │   ├── selections.ts   # 选菜路由
│   │   │   │   ├── notifications.ts
│   │   │   │   ├── poll.ts         # 轮询接口
│   │   │   │   └── uploads.ts      # 通用图片上传
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts  # AuthService + UserService + ServiceError
│   │   │   │   ├── dish.service.ts  # DishService（含所有权校验）
│   │   │   │   └── menu.service.ts  # MenuService + NotificationService
│   │   │   ├── db/
│   │   │   │   ├── schema.sql       # 20 张表 DDL
│   │   │   │   └── seed.sql         # 预置数据（分类/烹饪方式/标签）
│   │   │   └── utils/
│   │   │       ├── password.ts      # PBKDF2 哈希（Web Crypto API）
│   │   │       └── response.ts      # ok(), error(), parsePagination()
│   │   ├── src/__tests__/           # 12 个测试文件，274 个测试用例
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                         # 前端 (Vue 3 SPA + PWA)
│       ├── public/
│       │   ├── favicon.svg
│       │   ├── apple-touch-icon.png
│       │   └── pwa-*.png            # PWA 图标
│       ├── src/
│       │   ├── main.ts              # 入口（Pinia + Router + i18n）
│       │   ├── App.vue
│       │   ├── i18n/
│       │   │   ├── index.ts         # vue-i18n 配置（自动检测浏览器语言）
│       │   │   └── locales/
│       │   │       ├── zh.json      # 中文（默认）
│       │   │       ├── en.json      # English
│       │   │       ├── es.json      # Español
│       │   │       └── ar.json      # العربية
│       │   ├── router/
│       │   │   └── index.ts         # Vue Router 路由守卫 + 路由表
│       │   ├── stores/
│       │   │   ├── auth.ts          # Pinia auth store（token/user/login/logout）
│       │   │   └── notification.ts  # Pinia notification store（30s 轮询）
│       │   ├── api/
│       │   │   └── client.ts        # Fetch HTTP 客户端（自动注入 Auth header）
│       │   ├── views/               # 26 个页面组件
│       │   │   ├── Login.vue
│       │   │   ├── Register.vue
│       │   │   ├── Home.vue
│       │   │   ├── MenuCreate.vue
│       │   │   ├── MenuDetail.vue
│       │   │   ├── MenuManage.vue
│       │   │   ├── MenuPrint.vue
│       │   │   ├── DishList.vue
│       │   │   ├── DishCreate.vue
│       │   │   ├── DishDetail.vue
│       │   │   ├── DishEdit.vue
│       │   │   ├── Notifications.vue
│       │   │   ├── Profile.vue
│       │   │   ├── ProfileEdit.vue
│       │   │   ├── ChangePassword.vue
│       │   │   ├── Preferences.vue  # 饮食偏好 + 过敏食材
│       │   │   ├── Favorites.vue    # 个人收藏
│       │   │   ├── Help.vue         # 帮助页面
│       │   │   └── admin/
│       │   │       ├── AdminHome.vue
│       │   │       ├── UserManage.vue
│       │   │       ├── UserCreate.vue
│       │   │       ├── IngredientManage.vue
│       │   │       ├── IngredientCategoryManage.vue
│       │   │       ├── CookingMethodManage.vue
│       │   │       └── TagManage.vue
│       │   ├── components/
│       │   │   ├── AppLayout.vue    # 底部导航布局（5 个 Tab）
│       │   │   ├── BottomNav.vue
│       │   │   ├── MarkdownEditor.vue # Markdown 编辑器（工具栏 + 预览）
│       │   │   └── ToastContainer.vue
│       │   ├── composables/
│       │   │   └── useToast.ts      # Toast 通知组合式函数
│       │   └── styles/
│       │       └── variables.css
│       ├── e2e/
│       │   └── app.spec.ts          # 30 个 Playwright E2E 测试
│       ├── src/__tests__/           # 4 个测试文件，24 个测试用例
│       ├── vite.config.ts           # Vite + PWA + 代理 + 代码分割
│       ├── playwright.config.ts     # Playwright 配置（locale: zh-CN）
│       ├── index.html
│       └── package.json
│
├── Dockerfile                       # 多阶段 Docker 构建
├── docker-compose.yml               # Docker Compose 部署配置
├── package.json                     # 根 workspace 脚本
├── pnpm-workspace.yaml              # packages/*
├── tsconfig.base.json
├── requirement.md
└── README.md
```

## 技术选型

| 技术 | 选型 | 说明 |
|------|------|------|
| 包管理 | pnpm 10+ workspace | Monorepo 管理 |
| 前端框架 | Vue 3.5 Composition API | 轻量高效 |
| 构建工具 | Vite 6.4 | 快速开发体验 |
| 状态管理 | Pinia 2.2 | Vue 3 官方推荐 |
| 路由 | Vue Router 4.4 | SPA 路由 |
| 国际化 | vue-i18n 9 | 4 语言（zh/en/es/ar） |
| HTTP 客户端 | 原生 fetch 封装 | 自动注入 JWT |
| 后端框架 | Hono.js 4.6 | 轻量级 Web 框架 |
| 运行时 | Node.js 20+ | @hono/node-server |
| 数据库 | better-sqlite3 | 本地 SQLite |
| 文件存储 | 本地文件系统 | data/photos/ 目录 |
| 密码哈希 | PBKDF2 (Web Crypto API) | 100000 次迭代 |
| JWT | jose | HS256, 7 天有效期 |
| 拼音 | pinyin-pro | 前端拼音转换 |
| Markdown | marked + DOMPurify | 安全渲染 |
| PWA | vite-plugin-pwa (Workbox) | 离线支持 |
| 测试 | Vitest 3.2 + Playwright 1.58 | 单元/集成/E2E |
| 部署 | Docker + GitHub Actions | 自动 CI/CD |

## 与原设计的差异

| 变更项 | 原设计 | 当前实现 |
|--------|--------|----------|
| 后端运行时 | Cloudflare Workers | Node.js 20 + @hono/node-server |
| 数据库 | Cloudflare D1 | better-sqlite3（通过 D1 兼容适配器） |
| 文件存储 | Cloudflare R2 | 本地文件系统（通过 R2 兼容适配器） |
| UI 组件库 | 待定 / Vant 4 | 纯手写 CSS |
| 国际化 | 未规划 | vue-i18n 4 语言 |
| 用户偏好 | 未规划 | 饮食备注 + 过敏食材 |
| 过敏原检测 | 未规划 | 菜单过敏原冲突警告 |
| Markdown 编辑器 | 未规划 | 自定义编辑器 + 工具栏 + 图片上传 |
| 速率限制 | 未规划 | 内存 IP 限流中间件 |
| 部署 | Cloudflare Workers + Pages | Docker 多阶段构建 + GitHub Actions |
