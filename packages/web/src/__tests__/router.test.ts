import { describe, it, expect, beforeEach } from 'vitest';
import { router } from '@/router/index';

describe('Router', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('route definitions', () => {
    it('should have login route marked as public', () => {
      const login = router.getRoutes().find((r) => r.path === '/login');
      expect(login).toBeDefined();
      expect(login?.meta.public).toBe(true);
    });

    it('should have register route marked as public', () => {
      const register = router.getRoutes().find((r) => r.path === '/register');
      expect(register).toBeDefined();
      expect(register?.meta.public).toBe(true);
    });

    it('should have home route at /', () => {
      const home = router.getRoutes().find((r) => r.path === '/');
      expect(home).toBeDefined();
      expect(home?.meta.public).toBeFalsy();
    });

    it('should have all admin routes with admin meta', () => {
      const adminRoutes = router.getRoutes().filter((r) => r.path.startsWith('/admin'));
      expect(adminRoutes.length).toBeGreaterThanOrEqual(7);
      adminRoutes.forEach((r) => {
        expect(r.meta.admin).toBe(true);
      });
    });

    it('should include all expected user routes', () => {
      const paths = router.getRoutes().map((r) => r.path);
      expect(paths).toContain('/dishes');
      expect(paths).toContain('/dishes/create');
      expect(paths).toContain('/notifications');
      expect(paths).toContain('/favorites');
      expect(paths).toContain('/profile');
      expect(paths).toContain('/profile/edit');
      expect(paths).toContain('/profile/preferences');
      expect(paths).toContain('/profile/password');
      expect(paths).toContain('/help');
    });

    it('should include menu routes with dynamic params', () => {
      const paths = router.getRoutes().map((r) => r.path);
      expect(paths).toContain('/menus/create');
      expect(paths).toContain('/menus/:id');
      expect(paths).toContain('/menus/:id/manage');
      expect(paths).toContain('/menus/:id/print');
    });

    it('should include dish routes with dynamic params', () => {
      const paths = router.getRoutes().map((r) => r.path);
      expect(paths).toContain('/dishes/:id');
      expect(paths).toContain('/dishes/:id/edit');
    });

    it('should have correct total number of routes', () => {
      // 2 public + 15 authenticated + 7 admin = 24
      const total = router.getRoutes().length;
      expect(total).toBeGreaterThanOrEqual(24);
    });
  });

  describe('navigation guards', () => {
    it('should redirect to login when not authenticated on protected route', async () => {
      localStorage.removeItem('token');
      await router.push('/dishes');
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should allow access to public route without token', async () => {
      localStorage.removeItem('token');
      await router.push('/login');
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should allow access to protected route with token', async () => {
      localStorage.setItem('token', 'valid-token');
      await router.push('/dishes');
      expect(router.currentRoute.value.path).toBe('/dishes');
    });

    it('should redirect non-admin to / on admin route', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, isAdmin: false }));
      await router.push('/admin');
      expect(router.currentRoute.value.path).toBe('/');
    });

    it('should allow admin access to admin routes', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ id: 1, isAdmin: true }));
      await router.push('/admin');
      expect(router.currentRoute.value.path).toBe('/admin');
    });

    it('should redirect to login if user JSON is corrupted on admin route', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', 'not-json');
      await router.push('/admin/users');
      expect(router.currentRoute.value.path).toBe('/login');
    });

    it('should redirect to / if user object has no isAdmin on admin route', async () => {
      localStorage.setItem('token', 'valid-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      await router.push('/admin/tags');
      expect(router.currentRoute.value.path).toBe('/');
    });
  });
});
