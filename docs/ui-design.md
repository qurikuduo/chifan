# 界面设计

> 最后更新：2026-03-31，与实际代码实现保持一致

## 设计原则

- **移动优先**：主要面向手机屏幕，适配桌面端
- **纯 CSS**：不使用第三方 UI 组件库，手写 CSS 变量 + Flex 布局
- **PWA**：支持离线访问，可安装到桌面
- **国际化**：4 语言（中文/English/Español/العربية），默认跟随浏览器语言

## 导航结构

### 底部导航栏（5 Tab）

| Tab | 图标 | i18n key | 路由 | 激活条件 |
|-----|------|----------|------|----------|
| 首页 | 🏠 | `nav.home` | `/` | `path === '/'` |
| 菜品 | 🍽 | `nav.dishes` | `/dishes` | `path.startsWith('/dishes')` |
| 收藏 | ❤️ | `nav.favorites` | `/favorites` | `path === '/favorites'` |
| 通知 | 🔔 | `nav.notifications` | `/notifications` | `path === '/notifications'` |
| 我的 | 👤 | `nav.profile` | `/profile` | `path.startsWith('/profile')` |

通知 Tab 显示未读计数角标（超过 99 显示 `99+`）。

### 顶部栏

- 固定吸顶（`position: sticky`），高度 48px
- 左侧返回按钮（可选）
- 中间标题
- 右侧操作区（slot）

---

## 路由表

### 公开页面

| 路由 | 组件 | 说明 |
|------|------|------|
| `/login` | Login.vue | 用户名/邮箱 + 密码登录 |
| `/register` | Register.vue | 注册（需管理员审批） |

### 需要登录

| 路由 | 组件 | 说明 |
|------|------|------|
| `/` | Home.vue | 首页 — 今日菜单、快捷操作 |
| `/menus/create` | MenuCreate.vue | 创建菜单（搜索添加菜品、快速新建菜品） |
| `/menus/:id` | MenuDetail.vue | 菜单详情（选菜、查看汇总） |
| `/menus/:id/manage` | MenuManage.vue | 菜单管理（状态流转、编辑） |
| `/menus/:id/print` | MenuPrint.vue | 打印友好菜单视图 |
| `/dishes` | DishList.vue | 菜品列表（搜索、筛选标签/食材/烹饪方式） |
| `/dishes/create` | DishCreate.vue | 创建菜品（Markdown 描述编辑器、图片上传） |
| `/dishes/:id` | DishDetail.vue | 菜品详情（照片轮播、食材标签展示） |
| `/dishes/:id/edit` | DishEdit.vue | 编辑菜品 |
| `/notifications` | Notifications.vue | 通知列表（全部已读、单条已读） |
| `/favorites` | Favorites.vue | 个人收藏菜品 |
| `/profile` | Profile.vue | 个人中心（语言切换、管理入口） |
| `/profile/edit` | ProfileEdit.vue | 编辑个人信息 |
| `/profile/preferences` | Preferences.vue | 饮食偏好 + 过敏食材设置 |
| `/profile/password` | ChangePassword.vue | 修改密码 |
| `/help` | Help.vue | 帮助文档 |

### 管理后台（需管理员权限）

| 路由 | 组件 | 说明 |
|------|------|------|
| `/admin` | AdminHome.vue | 管理首页 — 数据概览 |
| `/admin/users` | UserManage.vue | 用户管理 — 审批/列表 |
| `/admin/users/create` | UserCreate.vue | 创建用户 |
| `/admin/ingredients` | IngredientManage.vue | 食材管理 |
| `/admin/ingredient-categories` | IngredientCategoryManage.vue | 食材分类管理 |
| `/admin/cooking-methods` | CookingMethodManage.vue | 烹饪方式管理 |
| `/admin/tags` | TagManage.vue | 标签管理 |

### 路由守卫

- 未登录用户访问非公开页面 → 跳转 `/login`
- 非管理员访问 `meta.admin` 页面 → 跳转 `/`
- Token 存储于 `localStorage`

---

## 核心页面说明

### 首页 Home

- 展示今日/近期菜单卡片
- 快捷操作：创建菜单、浏览菜品
- 显示需要处理的菜单邀请

### 菜单创建 MenuCreate

- 基本信息表单：标题、餐次（早/午/晚/下午茶/宵夜）、用餐时间、截止时间
- 搜索添加菜品（支持拼音模糊搜索，最多 30 条结果）
- **快速新建菜品**：直接在菜单创建流程中添加新菜品
- 选择受邀家庭成员、协作者
- 底部固定操作栏：保存草稿 / 发布

### 菜单详情 MenuDetail

- 菜品列表（含照片、描述）
- 选菜功能（选中/取消）
- 选菜汇总视图
- **过敏原冲突警告**：检测受邀人过敏食材
- 状态流转按钮（发布→结束选菜→开始做饭→完成）

### 菜品列表 DishList

- 顶部搜索栏（支持拼音搜索）
- 筛选：标签、食材、烹饪方式
- 瀑布流 / 列表展示
- 底部 FAB 按钮跳转新建菜品

### 菜品创建/编辑

- 名称输入（自动生成拼音）
- **Markdown 编辑器**：工具栏（加粗/斜体/列表/图片上传）、编辑/预览切换
- 食材多选（按分类分组）
- 烹饪方式多选
- 标签多选
- 照片上传（支持多张，设置默认照片）

### 个人中心 Profile

- 头像、昵称、家庭角色
- **语言切换器**（zh/en/es/ar）
- 菜单：编辑信息、修改密码、饮食偏好、帮助
- 管理员入口（仅管理员可见）
- 退出登录

### 饮食偏好 Preferences

- 文字备注（饮食禁忌、偏好说明）
- 过敏食材选择（按分类分组的食材列表，多选）
- 保存后用于菜单过敏原冲突检测

### 收藏 Favorites

- 当前用户收藏的菜品列表
- 支持直接从列表移除收藏

### 通知 Notifications

- 通知列表（未读/已读状态标识）
- 一键全部标为已读
- 30 秒自动轮询新通知
- 通知类型：菜单邀请、选菜提醒、状态变更等

---

## 通用组件

| 组件 | 说明 |
|------|------|
| `AppLayout.vue` | 页面布局（顶部栏 + 内容区 + 底部导航） |
| `BottomNav.vue` | 底部 5 Tab 导航 |
| `MarkdownEditor.vue` | Markdown 编辑器（工具栏 + 实时预览，marked + DOMPurify 渲染） |
| `ToastContainer.vue` | Toast 提示容器 |

## 组合式函数

| 函数 | 说明 |
|------|------|
| `useToast()` | Toast 通知（success/error/info），自动消失 |

## 状态管理（Pinia）

| Store | 说明 |
|-------|------|
| `auth` | Token、用户信息、登录/登出、`isLoggedIn`、`isAdmin` 计算属性 |
| `notification` | 未读计数、30 秒轮询、`startPolling()`、`stopPolling()` |

## HTTP 客户端

- `api/client.ts`：基于原生 `fetch` 封装
- 自动注入 `Authorization: Bearer <token>` 头
- 401 响应自动清除 token 并跳转登录页
- 统一错误处理

---

## 设计规范

### CSS 变量

采用 `styles/variables.css` 统一定义：

- 颜色：`--color-primary`、`--color-bg-white`、`--color-text`、`--color-border`、...
- 字号：`--font-size-sm/md/lg/xl`
- 间距：`--spacing-xs/sm/md/lg/xl`
- 圆角：`--radius-sm/md/lg`

### 响应式布局

- 移动端：全宽度，底部导航
- 桌面端：最大宽度居中，侧边导航可选

### 无障碍

- 语义化 HTML 标签
- 表单 label 关联
- 颜色对比度满足 WCAG AA
