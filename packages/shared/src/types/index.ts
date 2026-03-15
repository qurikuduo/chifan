export type { User, UserPublic, RegisterInput, LoginInput, LoginResponse, CreateUserInput, UpdateUserInput, ChangePasswordInput } from './user.js';
export type { Dish, DishPhoto, DishDetail, DishListItem, CreateDishInput, UpdateDishInput, DishSearchItem, UserFavorites, IngredientCategory, Ingredient, IngredientRef, CreateIngredientInput, CookingMethod, CookingMethodRef, Tag, TagRef } from './dish.js';
export type { Menu, MenuCreator, MenuInvitee, MenuDishItem, MenuDetail, MenuListItem, CreateMenuInput, UpdateMenuInput, AddMenuDishInput, SelectionInput, SelectionSummary, PrintMenu } from './menu.js';
export type { Notification, PushSubscriptionInput, PollResponse } from './notification.js';

// ===== 通用响应类型 =====

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
