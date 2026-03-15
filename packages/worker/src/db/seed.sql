-- =============================================
-- 预置数据 (Seed)
-- =============================================

-- 默认管理员（部署后需运行 scripts/init-admin-password.mjs 设置密码哈希）
-- 密码 admin123456 对应的 PBKDF2-SHA256 哈希（100000 iterations）
-- 注意：此哈希仅供演示，生产环境部署后请立即修改密码
INSERT OR IGNORE INTO users (id, username, email, password_hash, display_name, family_role, is_admin, status)
VALUES ('admin001', 'admin', 'admin@family.local', 'REPLACE_WITH_HASH', '管理员', NULL, 1, 'approved');

-- 原材料分类
INSERT OR IGNORE INTO ingredient_categories (id, name, sort_order) VALUES
('cat_meat', '肉类', 1),
('cat_vegetable', '蔬菜', 2),
('cat_seafood', '海鲜', 3),
('cat_staple', '主食', 4),
('cat_bean', '豆制品', 5),
('cat_egg_dairy', '蛋奶', 6),
('cat_seasoning', '调料', 7),
('cat_other', '其他', 99);

-- 烹饪方式
INSERT OR IGNORE INTO cooking_methods (id, name) VALUES
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

-- 标签
INSERT OR IGNORE INTO tags (id, name) VALUES
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

-- 常用原材料
INSERT OR IGNORE INTO ingredients (id, name, pinyin, pinyin_initial, category_id) VALUES
-- 肉类
('ing_beef', '牛肉', 'niurou', 'nr', 'cat_meat'),
('ing_pork', '猪肉', 'zhurou', 'zr', 'cat_meat'),
('ing_chicken', '鸡肉', 'jirou', 'jr', 'cat_meat'),
('ing_duck', '鸭肉', 'yarou', 'yr', 'cat_meat'),
('ing_lamb', '羊肉', 'yangrou', 'yr', 'cat_meat'),
('ing_ribs', '排骨', 'paigu', 'pg', 'cat_meat'),
-- 蔬菜
('ing_kangkong', '空心菜', 'kongxincai', 'kxc', 'cat_vegetable'),
('ing_amaranth', '苋菜', 'xiancai', 'xc', 'cat_vegetable'),
('ing_potato', '土豆', 'tudou', 'td', 'cat_vegetable'),
('ing_carrot', '胡萝卜', 'huluobo', 'hlb', 'cat_vegetable'),
('ing_tomato', '番茄', 'fanqie', 'fq', 'cat_vegetable'),
('ing_cabbage', '白菜', 'baicai', 'bc', 'cat_vegetable'),
('ing_spinach', '菠菜', 'bocai', 'bc', 'cat_vegetable'),
('ing_eggplant', '茄子', 'qiezi', 'qz', 'cat_vegetable'),
('ing_green_pepper', '青椒', 'qingjiao', 'qj', 'cat_vegetable'),
('ing_mushroom', '蘑菇', 'mogu', 'mg', 'cat_vegetable'),
-- 海鲜
('ing_shrimp', '虾', 'xia', 'x', 'cat_seafood'),
('ing_fish', '鱼', 'yu', 'y', 'cat_seafood'),
('ing_squid', '鱿鱼', 'youyu', 'yy', 'cat_seafood'),
('ing_crab', '螃蟹', 'pangxie', 'px', 'cat_seafood'),
-- 主食
('ing_rice', '米饭', 'mifan', 'mf', 'cat_staple'),
('ing_noodle', '面条', 'miantiao', 'mt', 'cat_staple'),
('ing_bread', '面包', 'mianbao', 'mb', 'cat_staple'),
-- 豆制品
('ing_tofu', '豆腐', 'doufu', 'df', 'cat_bean'),
-- 蛋奶
('ing_egg', '鸡蛋', 'jidan', 'jd', 'cat_egg_dairy'),
('ing_milk', '牛奶', 'niunai', 'nn', 'cat_egg_dairy'),
-- 调料
('ing_miso', '味增', 'weizeng', 'wz', 'cat_seasoning'),
('ing_soy_sauce', '酱油', 'jiangyou', 'jy', 'cat_seasoning'),
('ing_salt', '盐', 'yan', 'y', 'cat_seasoning'),
('ing_sugar', '糖', 'tang', 't', 'cat_seasoning'),
('ing_vinegar', '醋', 'cu', 'c', 'cat_seasoning'),
('ing_garlic', '大蒜', 'dasuan', 'ds', 'cat_seasoning'),
('ing_ginger', '生姜', 'shengjiang', 'sj', 'cat_seasoning'),
('ing_green_onion', '葱', 'cong', 'c', 'cat_seasoning');
