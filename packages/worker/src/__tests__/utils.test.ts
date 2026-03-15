import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../utils/password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should produce a string with 3 colon-separated parts', async () => {
      const hash = await hashPassword('testpassword');
      const parts = hash.split(':');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('100000'); // iterations
    });

    it('should generate different hashes for same password (random salt)', async () => {
      const h1 = await hashPassword('same');
      const h2 = await hashPassword('same');
      expect(h1).not.toBe(h2);
    });

    it('should handle unicode passwords', async () => {
      const hash = await hashPassword('密码测试123');
      expect(hash.split(':')).toHaveLength(3);
    });

    it('should produce valid base64 salt and hash', async () => {
      const hash = await hashPassword('test');
      const [, salt, key] = hash.split(':');
      expect(() => atob(salt)).not.toThrow();
      expect(() => atob(key)).not.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const hash = await hashPassword('mypassword');
      expect(await verifyPassword('mypassword', hash)).toBe(true);
    });

    it('should reject wrong password', async () => {
      const hash = await hashPassword('correct');
      expect(await verifyPassword('wrong', hash)).toBe(false);
    });

    it('should verify unicode passwords', async () => {
      const hash = await hashPassword('中文密码');
      expect(await verifyPassword('中文密码', hash)).toBe(true);
      expect(await verifyPassword('错误密码', hash)).toBe(false);
    });

    it('should verify long passwords', async () => {
      const long = 'a'.repeat(200);
      const hash = await hashPassword(long);
      expect(await verifyPassword(long, hash)).toBe(true);
    });
  });
});

describe('Response Utils', () => {
  // We test parsePagination and paginatedResponse directly since they're pure functions
  // ok() and error() are thin wrappers around c.json() - tested implicitly by route tests

  describe('parsePagination', () => {
    // parsePagination takes a Hono Context; we create a minimal mock
    function mockContext(query: Record<string, string>) {
      return {
        req: {
          query: (key: string) => query[key],
        },
      } as any;
    }

    it('should return defaults for empty query', async () => {
      const { parsePagination } = await import('../utils/response');
      const result = parsePagination(mockContext({}));
      expect(result).toEqual({ page: 1, pageSize: 20, offset: 0 });
    });

    it('should parse page and pageSize', async () => {
      const { parsePagination } = await import('../utils/response');
      const result = parsePagination(mockContext({ page: '3', pageSize: '10' }));
      expect(result).toEqual({ page: 3, pageSize: 10, offset: 20 });
    });

    it('should clamp page to minimum 1', async () => {
      const { parsePagination } = await import('../utils/response');
      const result = parsePagination(mockContext({ page: '-5' }));
      expect(result.page).toBe(1);
    });

    it('should clamp pageSize to 1-100', async () => {
      const { parsePagination } = await import('../utils/response');
      expect(parsePagination(mockContext({ pageSize: '0' })).pageSize).toBe(1);
      expect(parsePagination(mockContext({ pageSize: '200' })).pageSize).toBe(100);
    });
  });

  describe('paginatedResponse', () => {
    it('should create paginated response structure', async () => {
      const { paginatedResponse } = await import('../utils/response');
      const result = paginatedResponse(['a', 'b'], 25, 2, 10);
      expect(result).toEqual({
        data: ['a', 'b'],
        pagination: { page: 2, pageSize: 10, total: 25, totalPages: 3 },
      });
    });

    it('should calculate totalPages correctly', async () => {
      const { paginatedResponse } = await import('../utils/response');
      expect(paginatedResponse([], 0, 1, 20).pagination.totalPages).toBe(0);
      expect(paginatedResponse([], 1, 1, 20).pagination.totalPages).toBe(1);
      expect(paginatedResponse([], 21, 1, 20).pagination.totalPages).toBe(2);
    });
  });
});
