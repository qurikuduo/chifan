-- =============================================
-- 家庭用餐协作网站 - 数据库建表 SQL
-- Cloudflare D1 (SQLite)
-- =============================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username        TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    family_role     TEXT,
    is_admin        INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'pending',
    avatar_url      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,
    expires_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- 菜品表
CREATE TABLE IF NOT EXISTS dishes (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL,
    description     TEXT,
    pinyin          TEXT,
    pinyin_initial  TEXT,
    default_photo_id TEXT,
    created_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dishes_name ON dishes(name);
CREATE INDEX IF NOT EXISTS idx_dishes_pinyin ON dishes(pinyin);
CREATE INDEX IF NOT EXISTS idx_dishes_pinyin_initial ON dishes(pinyin_initial);
CREATE INDEX IF NOT EXISTS idx_dishes_created_by ON dishes(created_by);

-- 菜品照片表
CREATE TABLE IF NOT EXISTS dish_photos (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    photo_url       TEXT NOT NULL,
    file_size       INTEGER,
    mime_type       TEXT,
    uploaded_by     TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dish_photos_dish ON dish_photos(dish_id);

-- 原材料分类表
CREATE TABLE IF NOT EXISTS ingredient_categories (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 原材料表
CREATE TABLE IF NOT EXISTS ingredients (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,
    pinyin          TEXT,
    pinyin_initial  TEXT,
    category_id     TEXT REFERENCES ingredient_categories(id) ON DELETE SET NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_pinyin ON ingredients(pinyin);
CREATE INDEX IF NOT EXISTS idx_ingredients_initial ON ingredients(pinyin_initial);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category_id);

-- 烹饪方式表
CREATE TABLE IF NOT EXISTS cooking_methods (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name            TEXT NOT NULL UNIQUE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 菜品-原材料关联表
CREATE TABLE IF NOT EXISTS dish_ingredients (
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    ingredient_id   TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_ingredients_dish ON dish_ingredients(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_ingredients_ingredient ON dish_ingredients(ingredient_id);

-- 菜品-烹饪方式关联表
CREATE TABLE IF NOT EXISTS dish_cooking_methods (
    dish_id             TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    cooking_method_id   TEXT NOT NULL REFERENCES cooking_methods(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, cooking_method_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_methods_dish ON dish_cooking_methods(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_methods_method ON dish_cooking_methods(cooking_method_id);

-- 菜品-标签关联表
CREATE TABLE IF NOT EXISTS dish_tags (
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    tag_id          TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_dish_tags_dish ON dish_tags(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_tags_tag ON dish_tags(tag_id);

-- 菜单表
CREATE TABLE IF NOT EXISTS menus (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title           TEXT NOT NULL,
    meal_type       TEXT NOT NULL,
    meal_time       TEXT NOT NULL,
    deadline        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'draft',
    created_by      TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_menus_status ON menus(status);
CREATE INDEX IF NOT EXISTS idx_menus_created_by ON menus(created_by);
CREATE INDEX IF NOT EXISTS idx_menus_meal_time ON menus(meal_time);
CREATE INDEX IF NOT EXISTS idx_menus_deadline ON menus(deadline);

-- 菜单创建者/协作厨师表
CREATE TABLE IF NOT EXISTS menu_creators (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'collaborator',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (menu_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_creators_menu ON menu_creators(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_creators_user ON menu_creators(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_creators_menu_user ON menu_creators(menu_id, user_id);

-- 菜单-菜品关联表
CREATE TABLE IF NOT EXISTS menu_dishes (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    dish_id         TEXT NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
    photo_url       TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    added_by        TEXT NOT NULL REFERENCES users(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(menu_id, dish_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_dishes_menu ON menu_dishes(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_dishes_dish ON menu_dishes(dish_id);

-- 菜单邀请表
CREATE TABLE IF NOT EXISTS menu_invitees (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    has_selected    INTEGER NOT NULL DEFAULT 0,
    selected_at     TEXT,
    PRIMARY KEY (menu_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_menu_invitees_menu ON menu_invitees(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_invitees_user ON menu_invitees(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_invitees_menu_user ON menu_invitees(menu_id, user_id);

-- 选菜记录表
CREATE TABLE IF NOT EXISTS dish_selections (
    menu_id         TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    menu_dish_id    TEXT NOT NULL REFERENCES menu_dishes(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (menu_id, menu_dish_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_selections_menu ON dish_selections(menu_id);
CREATE INDEX IF NOT EXISTS idx_selections_user ON dish_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_selections_dish ON dish_selections(menu_dish_id);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            TEXT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT,
    related_menu_id TEXT REFERENCES menus(id) ON DELETE SET NULL,
    is_read         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 浏览器推送订阅表
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    p256dh_key      TEXT NOT NULL,
    auth_key        TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- 用户饮食偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dietary_notes       TEXT,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 用户过敏食材关联表
CREATE TABLE IF NOT EXISTS user_allergens (
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ingredient_id   TEXT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_user_allergens_user ON user_allergens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergens_ingredient ON user_allergens(ingredient_id);
