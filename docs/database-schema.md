# 数据库表结构设计（Cloudflare D1 / SQLite）

## ER 关系概览

```
users ─┬── user_sessions
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

ingredients (原材料)
cooking_methods (烹饪方式)
tags (标签)
ingredient_categories (原材料分类)
```

---

## 表定义

### 1. users（用户表）

```sql
CREATE TABLE users (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username        TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,              -- 显示名称
    family_role     TEXT,                       -- 家庭角色：父亲、母亲、爷爷、奶奶等（可自定义）
    is_admin        INTEGER NOT NULL DEFAULT 0, -- 是否管理员
    status          TEXT NOT NULL DEFAULT 'pending', -- pending(待审批) / approved(已通过) / rejected(已拒绝)
    avatar_url      TEXT,                       -- 头像URL（可选）
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
```

### 2. user_sessions（用户会话表）

```sql
CREATE TABLE user_sessions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,       -- JWT token 的 hash（用于吊销）
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
```

### 3. dishes（菜品表）

```sql
CREATE TABLE dishes (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL,
    description     TEXT,                       -- 描述/备注
    default_photo_id TEXT,                      -- 默认照片ID，关联 dish_photos
    created_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dishes_name ON dishes(name);
CREATE INDEX idx_dishes_created_by ON dishes(created_by);
```

### 4. dish_photos（菜品照片表）

```sql
CREATE TABLE dish_photos (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    photo_url       TEXT NOT NULL,              -- R2 存储路径
    file_size       INTEGER,                    -- 文件大小（字节）
    mime_type       TEXT,                       -- image/jpeg, image/png, image/webp
    uploaded_by     TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dish_photos_dish ON dish_photos(dish_id);
```

### 5. ingredient_categories（原材料分类表）

```sql
CREATE TABLE ingredient_categories (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,       -- 肉类、蔬菜、海鲜、调料、主食、豆制品、蛋奶等
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 6. ingredients（原材料表）

```sql
CREATE TABLE ingredients (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,       -- 原材料名称
    pinyin          TEXT,                       -- 拼音（全拼），用于搜索
    pinyin_initial  TEXT,                       -- 拼音首字母，用于搜索
    category_id     TEXT REFERENCES ingredient_categories(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_pinyin ON ingredients(pinyin);
CREATE INDEX idx_ingredients_initial ON ingredients(pinyin_initial);
CREATE INDEX idx_ingredients_category ON ingredients(category_id);
```

### 7. cooking_methods（烹饪方式表）

```sql
CREATE TABLE cooking_methods (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,       -- 蒸、煮、煎、炸、烤、炒、拌、炖、焖、烧、卤等
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 8. tags（标签表）

```sql
CREATE TABLE tags (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,       -- 中餐、西餐、日本菜、汤类等
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 9. dish_ingredients（菜品-原材料关联表）

```sql
CREATE TABLE dish_ingredients (
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    ingredient_id   TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, ingredient_id)
);

CREATE INDEX idx_dish_ingredients_dish ON dish_ingredients(dish_id);
CREATE INDEX idx_dish_ingredients_ingredient ON dish_ingredients(ingredient_id);
```

### 10. dish_cooking_methods（菜品-烹饪方式关联表）

```sql
CREATE TABLE dish_cooking_methods (
    dish_id             TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    cooking_method_id   TEXT NOT NULL REFERENCES cooking_methods(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, cooking_method_id)
);

CREATE INDEX idx_dish_methods_dish ON dish_cooking_methods(dish_id);
CREATE INDEX idx_dish_methods_method ON dish_cooking_methods(cooking_method_id);
```

### 11. dish_tags（菜品-标签关联表）

```sql
CREATE TABLE dish_tags (
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    tag_id          TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, tag_id)
);

CREATE INDEX idx_dish_tags_dish ON dish_tags(dish_id);
CREATE INDEX idx_dish_tags_tag ON dish_tags(tag_id);
```

### 12. menus（菜单表）

```sql
CREATE TABLE menus (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title           TEXT NOT NULL,              -- 菜单标题
    meal_type       TEXT NOT NULL,              -- breakfast/lunch/dinner/afternoon_tea/late_night
    meal_time       TEXT NOT NULL,              -- 用餐时间
    deadline        TEXT NOT NULL,              -- 选菜截止时间
    status          TEXT NOT NULL DEFAULT 'draft', -- draft/published/selection_closed/cooking/completed
    created_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_menus_status ON menus(status);
CREATE INDEX idx_menus_created_by ON menus(created_by);
CREATE INDEX idx_menus_meal_time ON menus(meal_time);
CREATE INDEX idx_menus_deadline ON menus(deadline);
```

### 13. menu_creators（菜单创建者/协作厨师表）

```sql
CREATE TABLE menu_creators (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'collaborator', -- owner(创建者) / collaborator(协作厨师)
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (menu_id, user_id)
);

CREATE INDEX idx_menu_creators_menu ON menu_creators(menu_id);
CREATE INDEX idx_menu_creators_user ON menu_creators(user_id);
```

### 14. menu_dishes（菜单-菜品关联表）

```sql
CREATE TABLE menu_dishes (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    photo_url       TEXT,                       -- 本次菜单中该菜品使用的照片（可覆盖默认照片）
    sort_order      INTEGER NOT NULL DEFAULT 0,
    added_by        TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(menu_id, dish_id)
);

CREATE INDEX idx_menu_dishes_menu ON menu_dishes(menu_id);
CREATE INDEX idx_menu_dishes_dish ON menu_dishes(dish_id);
```

### 15. menu_invitees（菜单邀请表）

```sql
CREATE TABLE menu_invitees (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    has_selected    INTEGER NOT NULL DEFAULT 0, -- 是否已完成选菜
    selected_at     TEXT,                       -- 完成选菜的时间
    PRIMARY KEY (menu_id, user_id)
);

CREATE INDEX idx_menu_invitees_menu ON menu_invitees(menu_id);
CREATE INDEX idx_menu_invitees_user ON menu_invitees(user_id);
```

### 16. dish_selections（选菜记录表）

```sql
CREATE TABLE dish_selections (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    menu_dish_id    TEXT NOT NULL REFERENCES menu_dishes(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (menu_id, menu_dish_id, user_id)
);

CREATE INDEX idx_selections_menu ON dish_selections(menu_id);
CREATE INDEX idx_selections_user ON dish_selections(user_id);
CREATE INDEX idx_selections_dish ON dish_selections(menu_dish_id);
```

### 17. notifications（通知表）

```sql
CREATE TABLE notifications (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,              -- menu_published / selection_closed / meal_ready / user_approved / user_rejected
    title           TEXT NOT NULL,
    content         TEXT,
    related_menu_id TEXT REFERENCES menus(id) ON DELETE SET NULL,
    is_read         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

### 18. push_subscriptions（浏览器推送订阅表）

```sql
CREATE TABLE push_subscriptions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    p256dh_key      TEXT NOT NULL,
    auth_key        TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id);
```

---

## 预置数据

### 原材料分类
```sql
INSERT INTO ingredient_categories (id, name, sort_order) VALUES
('cat_meat', '肉类', 1),
('cat_vegetable', '蔬菜', 2),
('cat_seafood', '海鲜', 3),
('cat_staple', '主食', 4),
('cat_bean', '豆制品', 5),
('cat_egg_dairy', '蛋奶', 6),
('cat_seasoning', '调料', 7),
('cat_other', '其他', 99);
```

### 烹饪方式
```sql
INSERT INTO cooking_methods (id, name) VALUES
('cm_steam', '蒸'),
('cm_boil', '煮'),
('cm_fry', '煎'),
('cm_deep_fry', '炸'),
('cm_roast', '烤'),
('cm_stir_fry', '炒'),
('cm_mix', '拌'),
('cm_stew', '炖'),
('cm_braise', '焖'),
('cm_red_cook', '烧'),
('cm_marinade', '卤'),
('cm_raw', '生食');
```

### 标签
```sql
INSERT INTO tags (id, name) VALUES
('tag_chinese', '中餐'),
('tag_western', '西餐'),
('tag_spanish', '西班牙菜'),
('tag_japanese', '日本菜'),
('tag_korean', '韩国菜'),
('tag_soup', '汤类'),
('tag_fried_rice', '炒饭'),
('tag_noodle', '面食'),
('tag_dessert', '甜品'),
('tag_salad', '沙拉'),
('tag_bbq', '烧烤');
```

---

## 字段说明

- 所有主键使用 UUID（hex randomblob 生成），以 TEXT 存储
- 时间字段统一使用 ISO8601 格式 TEXT 存储（SQLite 推荐方式）
- status 枚举值使用英文字符串，前端展示时做映射
- 菜单状态枚举：draft → published → selection_closed → cooking → completed
- 用户状态枚举：pending → approved / rejected
- 通知类型枚举：menu_published / selection_closed / meal_ready / user_approved / user_rejected
- 餐次类型枚举：breakfast / lunch / dinner / afternoon_tea / late_night
