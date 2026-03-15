import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { LoginInput, RegisterInput, LoginResponse } from '@family-menu/shared';
import { api } from '@/api/client';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<LoginResponse['user'] | null>(
    (() => {
      try {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })()
  );

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => !!user.value?.isAdmin);
  const userId = computed(() => user.value?.id ?? '');

  async function login(input: LoginInput) {
    const res = await api.post<LoginResponse>('/auth/login', input);
    token.value = res.token;
    user.value = res.user;
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  async function register(input: RegisterInput) {
    await api.post('/auth/register', input);
  }

  async function fetchMe() {
    const res = await api.get<LoginResponse['user']>('/auth/me');
    user.value = res;
    localStorage.setItem('user', JSON.stringify(res));
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      token.value = null;
      user.value = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  return { token, user, isLoggedIn, isAdmin, userId, login, register, fetchMe, logout };
});
