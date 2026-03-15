# 项目结构设计

```
codextest/
├── .github/
│   └── instructions/
│       └── copilot.instructions.md
├── docs/                          # 文档目录
│   ├── requirement.md             → 移至此处（或保留根目录）
│   ├── database-schema.md
│   ├── api-design.md
│   └── ui-design.md
│
├── packages/                      # Monorepo 结构
│   ├── shared/                    # 前后端共享类型和工具
│   │   ├── src/
│   │   │   ├── types/             # TypeScript 类型定义
│   │   │   │   ├── user.ts
│   │   │   │   ├── dish.ts
│   │   │   │   ├── menu.ts
│   │   │   │   ├── notification.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/         # 常量（状态枚举、餐次类型等）
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── worker/                    # Cloudflare Worker 后端
│   │   ├── src/
│   │   │   ├── index.ts           # Worker 入口
│   │   │   ├── router.ts          # 路由定义
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts        # JWT 认证中间件
│   │   │   │   └── cors.ts        # CORS 中间件
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # 认证路由
│   │   │   │   ├── users.ts       # 用户管理路由
│   │   │   │   ├── dishes.ts      # 菜品路由
│   │   │   │   ├── ingredients.ts # 原材料路由
│   │   │   │   ├── cooking-methods.ts
│   │   │   │   ├── tags.ts        # 标签路由
│   │   │   │   ├── menus.ts       # 菜单路由
│   │   │   │   ├── selections.ts  # 选菜路由
│   │   │   │   ├── notifications.ts
│   │   │   │   └── poll.ts        # 轮询路由
│   │   │   ├── services/          # 业务逻辑层
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   ├── dish.service.ts
│   │   │   │   ├── ingredient.service.ts
│   │   │   │   ├── menu.service.ts
│   │   │   │   ├── selection.service.ts
│   │   │   │   └── notification.service.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.sql     # 建表SQL
│   │   │   │   ├── seed.sql       # 预置数据
│   │   │   │   └── migrations/    # 数据库迁移
│   │   │   └── utils/
│   │   │       ├── jwt.ts
│   │   │       ├── password.ts    # 密码哈希
│   │   │       ├── pinyin.ts      # 拼音转换
│   │   │       └── response.ts    # 统一响应格式
│   │   ├── wrangler.toml          # Cloudflare Worker 配置
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                       # Vue 3 前端
│       ├── public/
│       │   ├── favicon.ico
│       │   ├── manifest.json      # PWA manifest
│       │   └── sw.js              # Service Worker
│       ├── src/
│       │   ├── main.ts            # 入口
│       │   ├── App.vue
│       │   ├── router/
│       │   │   └── index.ts       # Vue Router 路由配置
│       │   ├── stores/            # Pinia 状态管理
│       │   │   ├── auth.ts
│       │   │   ├── menu.ts
│       │   │   ├── dish.ts
│       │   │   └── notification.ts
│       │   ├── api/               # API 调用封装
│       │   │   ├── client.ts      # HTTP 客户端（fetch封装）
│       │   │   ├── auth.ts
│       │   │   ├── users.ts
│       │   │   ├── dishes.ts
│       │   │   ├── ingredients.ts
│       │   │   ├── menus.ts
│       │   │   ├── selections.ts
│       │   │   └── notifications.ts
│       │   ├── views/             # 页面组件
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
│       │   │   └── admin/
│       │   │       ├── AdminHome.vue
│       │   │       ├── UserManage.vue
│       │   │       ├── UserCreate.vue
│       │   │       ├── IngredientManage.vue
│       │   │       ├── IngredientCategoryManage.vue
│       │   │       ├── CookingMethodManage.vue
│       │   │       └── TagManage.vue
│       │   ├── components/        # 可复用组件
│       │   │   ├── layout/
│       │   │   │   ├── AppHeader.vue
│       │   │   │   ├── BottomNav.vue
│       │   │   │   └── AppLayout.vue
│       │   │   ├── common/
│       │   │   │   ├── LoadingSpinner.vue
│       │   │   │   ├── EmptyState.vue
│       │   │   │   ├── Toast.vue
│       │   │   │   └── PhotoUploader.vue
│       │   │   ├── dish/
│       │   │   │   ├── DishCard.vue
│       │   │   │   ├── DishPicker.vue    # 菜品选择弹窗
│       │   │   │   └── IngredientSearch.vue # 原材料搜索
│       │   │   └── menu/
│       │   │       ├── MenuCard.vue
│       │   │       ├── MenuStatusBadge.vue
│       │   │       └── SelectionItem.vue
│       │   ├── composables/       # Vue 3 组合式函数
│       │   │   ├── useAuth.ts
│       │   │   ├── usePolling.ts  # 轮询逻辑
│       │   │   ├── useAutoSave.ts # 自动保存
│       │   │   └── usePush.ts     # 浏览器推送
│       │   ├── styles/
│       │   │   ├── variables.css  # CSS 变量（颜色、字体等）
│       │   │   └── global.css
│       │   └── utils/
│       │       └── format.ts      # 格式化工具
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                   # 根 package.json（workspace配置）
├── pnpm-workspace.yaml            # pnpm workspace 配置
├── requirement.md
└── README.md
```

## 技术选型确认

| 技术 | 选型 | 说明 |
|------|------|------|
| 包管理 | pnpm + workspace | Monorepo 管理 |
| 前端框架 | Vue 3 Composition API | 轻量高效 |
| 构建工具 | Vite | 快速开发体验 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 路由 | Vue Router 4 | SPA 路由 |
| UI 组件库 | 待定（可用 Vant 4 移动端组件库或纯手写） |
| HTTP 客户端 | 原生 fetch 封装 | Worker 环境友好 |
| 后端框架 | Hono.js | 轻量级，完美适配 Cloudflare Workers |
| 数据库 | Cloudflare D1 | 内置 SQLite |
| 文件存储 | Cloudflare R2 | S3 兼容对象存储 |
| 密码哈希 | bcryptjs | Web Crypto API 兼容 |
| JWT | jose | 轻量级 JWT 库，支持 Workers |
| 拼音 | pinyin-pro | 拼音转换库 |
| PWA | vite-plugin-pwa | Vite PWA 插件 |
