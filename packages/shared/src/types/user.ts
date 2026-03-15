import type { UserStatus } from '../constants/index.js';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  familyRole: string | null;
  isAdmin: boolean;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserPublic {
  id: string;
  displayName: string;
  familyRole: string | null;
  avatarUrl: string | null;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  login: string; // username or email
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'status' | 'createdAt' | 'updatedAt'>;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  familyRole?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  familyRole?: string;
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}
