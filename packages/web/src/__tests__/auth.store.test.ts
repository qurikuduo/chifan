import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

// Mock API client
vi.mock('@/api/client', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '@/api/client';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with no auth state', () => {
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(false);
    expect(store.isAdmin).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });

  it('should initialize from localStorage', () => {
    localStorage.setItem('token', 'stored-token');
    localStorage.setItem('user', JSON.stringify({
      id: 'u1', username: 'admin', email: 'a@b.com',
      displayName: '管理员', isAdmin: true,
    }));

    // Need a fresh pinia since localStorage is read at store creation
    setActivePinia(createPinia());
    const store = useAuthStore();
    expect(store.isLoggedIn).toBe(true);
    expect(store.isAdmin).toBe(true);
    expect(store.user?.displayName).toBe('管理员');
  });

  it('should login and persist state', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      token: 'new-token',
      user: {
        id: 'u1', username: 'user1', email: 'u@b.com',
        displayName: '用户1', isAdmin: false,
      },
    });

    const store = useAuthStore();
    await store.login({ login: 'user1', password: 'pass123' });

    expect(store.isLoggedIn).toBe(true);
    expect(store.token).toBe('new-token');
    expect(store.user?.displayName).toBe('用户1');
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('should call register API', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const store = useAuthStore();
    await store.register({
      username: 'newuser',
      email: 'new@test.com',
      password: 'pass123',
      displayName: '新用户',
    });

    expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
      username: 'newuser',
    }));
  });

  it('should logout and clear state', async () => {
    localStorage.setItem('token', 'old-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));

    (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    setActivePinia(createPinia());
    const store = useAuthStore();
    await store.logout();

    expect(store.isLoggedIn).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should fetch and update user info', async () => {
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'u1', username: 'admin', email: 'a@b.com',
      displayName: '管理员更新', isAdmin: true,
    });

    const store = useAuthStore();
    await store.fetchMe();

    expect(store.user?.displayName).toBe('管理员更新');
    expect(JSON.parse(localStorage.getItem('user')!).displayName).toBe('管理员更新');
  });

  it('should handle malformed localStorage gracefully', () => {
    localStorage.setItem('user', 'invalid-json{{');

    setActivePinia(createPinia());
    const store = useAuthStore();
    expect(store.user).toBeNull();
  });
});
