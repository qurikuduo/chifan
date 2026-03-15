// ===== 用户状态 =====
export const UserStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// ===== 菜单状态 =====
export const MenuStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  SELECTION_CLOSED: 'selection_closed',
  COOKING: 'cooking',
  COMPLETED: 'completed',
} as const;
export type MenuStatus = (typeof MenuStatus)[keyof typeof MenuStatus];

// ===== 餐次类型 =====
export const MealType = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  AFTERNOON_TEA: 'afternoon_tea',
  LATE_NIGHT: 'late_night',
} as const;
export type MealType = (typeof MealType)[keyof typeof MealType];

// ===== 餐次类型中文映射 =====
export const MealTypeLabel: Record<MealType, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  afternoon_tea: '下午茶',
  late_night: '宵夜',
};

// ===== 菜单状态中文映射 =====
export const MenuStatusLabel: Record<MenuStatus, string> = {
  draft: '草稿',
  published: '选菜中',
  selection_closed: '选菜结束',
  cooking: '烹饪中',
  completed: '已完成',
};

// ===== 通知类型 =====
export const NotificationType = {
  MENU_PUBLISHED: 'menu_published',
  SELECTION_CLOSED: 'selection_closed',
  MEAL_READY: 'meal_ready',
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// ===== 菜单协作角色 =====
export const MenuCreatorRole = {
  OWNER: 'owner',
  COLLABORATOR: 'collaborator',
} as const;
export type MenuCreatorRole = (typeof MenuCreatorRole)[keyof typeof MenuCreatorRole];

// ===== 照片限制 =====
export const PHOTO_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ===== 分页默认值 =====
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;

// ===== 轮询间隔 =====
export const POLL_INTERVAL_MS = 30_000; // 30秒
