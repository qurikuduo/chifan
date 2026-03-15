export interface Dish {
  id: string;
  name: string;
  description: string | null;
  defaultPhotoId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DishPhoto {
  id: string;
  dishId: string;
  url: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string;
  createdAt: string;
}

export interface DishDetail extends Dish {
  defaultPhoto: DishPhoto | null;
  photos: DishPhoto[];
  tags: TagRef[];
  ingredients: IngredientRef[];
  cookingMethods: CookingMethodRef[];
  createdByUser: { id: string; displayName: string };
}

export interface DishListItem {
  id: string;
  name: string;
  description: string | null;
  defaultPhoto: { id: string; url: string } | null;
  tags: TagRef[];
  ingredients: IngredientRef[];
  cookingMethods: CookingMethodRef[];
  selectionCount: number;
  createdAt: string;
}

export interface CreateDishInput {
  name: string;
  description?: string;
  pinyin?: string;
  pinyinInitial?: string;
  ingredientIds?: string[];
  cookingMethodIds?: string[];
  tagIds?: string[];
  defaultPhotoId?: string;
}

export interface UpdateDishInput {
  name?: string;
  description?: string;
  pinyin?: string;
  pinyinInitial?: string;
  ingredientIds?: string[];
  cookingMethodIds?: string[];
  tagIds?: string[];
  defaultPhotoId?: string;
}

export interface DishSearchItem {
  id: string;
  name: string;
  description: string | null;
  pinyin: string | null;
  defaultPhoto: { id: string; url: string } | null;
  selectionCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface UserFavorites {
  userId: string;
  displayName: string;
  dishes: Array<{ id: string; name: string; count: number }>;
}

// === 原材料 ===

export interface IngredientCategory {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  name: string;
  pinyin: string | null;
  pinyinInitial: string | null;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientRef {
  id: string;
  name: string;
}

export interface CreateIngredientInput {
  name: string;
  categoryId?: string;
}

// === 烹饪方式 ===

export interface CookingMethod {
  id: string;
  name: string;
  createdAt: string;
}

export interface CookingMethodRef {
  id: string;
  name: string;
}

// === 标签 ===

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
}

export interface TagRef {
  id: string;
  name: string;
}
