import type { MealType, MenuStatus, MenuCreatorRole } from '../constants/index.js';
import type { UserPublic } from './user.js';

export interface Menu {
  id: string;
  title: string;
  mealType: MealType;
  mealTime: string;
  deadline: string;
  status: MenuStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCreator {
  userId: string;
  displayName: string;
  familyRole: string | null;
  role: MenuCreatorRole;
}

export interface MenuInvitee {
  userId: string;
  displayName: string;
  familyRole: string | null;
  hasSelected: boolean;
  selectedAt: string | null;
}

export interface MenuDishItem {
  menuDishId: string;
  dishId: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  sortOrder: number;
  addedBy: { id: string; displayName: string };
  selections: { userId: string; displayName: string; familyRole: string | null }[];
  selectionCount: number;
}

export interface MenuDetail extends Menu {
  createdByUser: UserPublic;
  creators: MenuCreator[];
  invitees: MenuInvitee[];
  dishes: MenuDishItem[];
}

export interface MenuListItem {
  id: string;
  title: string;
  mealType: MealType;
  mealTime: string;
  deadline: string;
  status: MenuStatus;
  createdByUser: UserPublic;
  dishCount: number;
  totalInvitees: number;
  completedInvitees: number;
  createdAt: string;
}

export interface CreateMenuInput {
  title: string;
  mealType: MealType;
  mealTime: string;
  deadline: string;
  inviteeIds: string[];
  collaboratorIds?: string[];
  dishes?: {
    dishId: string;
    photoUrl?: string;
    sortOrder?: number;
  }[];
}

export interface UpdateMenuInput {
  title?: string;
  mealType?: MealType;
  mealTime?: string;
  deadline?: string;
}

export interface AddMenuDishInput {
  dishId: string;
  photoUrl?: string;
  sortOrder?: number;
}

export interface SelectionInput {
  menuDishIds: string[];
}

export interface SelectionSummary {
  dishes: {
    menuDishId: string;
    dishName: string;
    photoUrl: string | null;
    selectionCount: number;
    selectedBy: { userId: string; displayName: string; familyRole: string | null }[];
  }[];
  totalInvitees: number;
  completedInvitees: number;
}

export interface PrintMenu {
  title: string;
  mealType: MealType;
  mealTime: string;
  dishes: {
    name: string;
    selectionCount: number;
    ingredients: string[];
    cookingMethods: string[];
  }[];
  totalInvitees: number;
}
