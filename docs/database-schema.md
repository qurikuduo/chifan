# 数据库表结构设计（SQLite / better-sqlite3）

> 最后更新：2026-03-31，与 `packages/worker/src/db/schema.sql` 保持一致

## ER 关系概览

```
users ─┬── user_sessions
       ├── user_preferences (饮食偏好 1:1)
       ├── user_allergens (过敏食材 M:N → ingredients)
       ├── menu_creators (菜单创建者/协作厨师)
       ├── menu_invitees (被邀请选菜的人)
       ├── dish_selections (选菜记录)
       └── notifications (通知)

menus ─┬── menu_dishes (菜单-菜品关联)
       ├── menu_creators
       ├── menu_invitees
       └── dish_selections

dishes ─┬── dish_photos
        ├── dish_ingredients (菜品-原材料关联)
        ├── dish_cooking_methods (菜品-烹饪方式关联)
        ├── dish_tags (菜品-标签关联)
        └── menu_dishes

ingredients ── ingredient_categories (原材料分类)
cooking_methods (烹饪方式)
tags (标签)
push_subscriptions (浏览器推送)
```

---

## 表定义（共 20 张表）

### 1. users — 用户表
### 2. user_sessions — 用户会话表
### 3. user_preferences — 用户饮食偏好表（后增）
### 4. user_allergens — 用户过敏食材关联表（后增）
### 5. dishes — 菜品表（含 pinyin/pinyin_initial 字段）
### 6. dish_photos — 菜品照片表
### 7. ingredient_categories — 原材料分类表
### 8. ingredients — 原材料表（含拼音搜索字段）
### 9. cooking_methods — 烹饪方式表
### 10. tags — 标签表
### 11. dish_ingredients — 菜品-原材料关联表
### 12. dish_cooking_methods — 菜品-烹饪方式关联表
### 13. dish_tags — 菜品-标签关联表
### 14. menus — 菜单表
### 15. menu_creators — 菜单创建者/协作厨师表
### 16. menu_dishes — 菜单-菜品关联表
### 17. menu_invitees — 菜单邀请表
### 18. dish_selections — 选菜记录表
### 19. notifications — 通知表
### 20. push_subscriptions — 浏览器推送订阅表

完整 DDL 参见 `packages/worker/src/db/schema.sql`。

---

## 与原设计的差异

| 变更 | 说明 |
|------|------|
| 新增 `user_preferences` 表 | 存储用户饮食备注（dietary_notes），1:1 关系 |
| 新增 `user_allergens` 表 | 用户过敏食材关联，用于菜单过敏原警告 |
| `dishes` 新增 `pinyin`、`pinyin_initial` | 支持拼音搜索（全拼 + 首字母） |
| 存储层从 Cloudflare R2 改为本地文件系统 | 图片存储在 `data/photos/` |
| 数据库从 Cloudflare D1 改为 better-sqlite3 | 本地 SQLite 文件 |

---

## 字段约定

- 所有主键：UUID（`lower(hex(randomblob(16)))`），TEXT 类型
- 时间字段：ISO8601 TEXT（`datetime('now')`）
- 密码哈希：PBKDF2 100000 次迭代，格式 `iterations:salt_b64:hash_b64`
- 菜品描述：Markdown 格式，前端用 `marked` + `DOMPurify` 渲染
- 菜单状态枚举：`draft → published → selection_closed → cooking → completed`
- 用户状态枚举：`pending → approved / rejected`
- 通知类型：`menu_published / selection_closed / meal_ready / user_approved / user_rejected`
- 餐次类型：`breakfast / lunch / dinner / afternoon_tea / late_night`
