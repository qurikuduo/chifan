import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, UserService, ServiceError } from '../services/auth.service';
import { createMockD1 } from './helpers/mock-d1';

// Mock password utilities
vi.mock('../utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('100000:fakesalt:fakehash'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  signToken: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

import { hashPassword, verifyPassword } from '../utils/password';

describe('AuthService', () => {
  let mock: ReturnType<typeof createMockD1>;
  let service: AuthService;

  beforeEach(() => {
    mock = createMockD1();
    service = new AuthService(mock.db, 'test-secret');
    mock.reset();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mock.mockFirst.mockResolvedValueOnce(null); // no existing user

      await service.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: '测试用户',
      });

      expect(mock.mockPrepare).toHaveBeenCalledTimes(2);
      expect(mock.mockRun).toHaveBeenCalledTimes(1);
      expect(hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should throw DUPLICATE when user already exists', async () => {
      mock.mockFirst.mockResolvedValueOnce({ id: 'existing-id' }); // existing user

      await expect(
        service.register({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          displayName: '测试用户',
        }),
      ).rejects.toThrow(ServiceError);

      try {
        mock.mockFirst.mockResolvedValueOnce({ id: 'existing-id' });
        await service.register({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          displayName: '测试用户',
        });
      } catch (e) {
        expect(e).toBeInstanceOf(ServiceError);
        expect((e as ServiceError).code).toBe('DUPLICATE');
        expect((e as ServiceError).status).toBe(409);
      }
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '100000:salt:hash',
      display_name: '测试用户',
      family_role: '爸爸',
      is_admin: 0,
      status: 'approved',
      avatar_url: null,
    };

    it('should login successfully with valid credentials', async () => {
      mock.mockFirst.mockResolvedValueOnce(mockUser);

      const result = await service.login({ login: 'testuser', password: 'password123' });

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-1');
      expect(result.user.username).toBe('testuser');
      expect(result.user.displayName).toBe('测试用户');
      expect(result.user.isAdmin).toBe(false);
    });

    it('should throw UNAUTHORIZED when user not found', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(
        service.login({ login: 'nonexistent', password: 'pass' }),
      ).rejects.toThrow('用户名或密码错误');
    });

    it('should throw FORBIDDEN when user is not approved', async () => {
      mock.mockFirst.mockResolvedValueOnce({ ...mockUser, status: 'pending' });

      await expect(
        service.login({ login: 'testuser', password: 'pass' }),
      ).rejects.toThrow('账号尚未通过审批');
    });

    it('should throw UNAUTHORIZED when password is wrong', async () => {
      mock.mockFirst.mockResolvedValueOnce(mockUser);
      (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      await expect(
        service.login({ login: 'testuser', password: 'wrongpass' }),
      ).rejects.toThrow('用户名或密码错误');
    });
  });

  describe('getUser', () => {
    it('should return user by id', async () => {
      mock.mockFirst.mockResolvedValueOnce({
        id: 'u1',
        username: 'admin',
        email: 'admin@test.com',
        display_name: '管理员',
        family_role: null,
        is_admin: 1,
        status: 'approved',
        avatar_url: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      });

      const user = await service.getUser('u1');
      expect(user.id).toBe('u1');
      expect(user.isAdmin).toBe(true);
      expect(user.displayName).toBe('管理员');
    });

    it('should throw NOT_FOUND when user does not exist', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(service.getUser('nonexistent')).rejects.toThrow('用户不存在');
    });
  });
});

describe('UserService', () => {
  let mock: ReturnType<typeof createMockD1>;
  let service: UserService;

  beforeEach(() => {
    mock = createMockD1();
    service = new UserService(mock.db);
    mock.reset();
  });

  describe('listUsers', () => {
    it('should return paginated users', async () => {
      mock.mockFirst.mockResolvedValueOnce({ total: 1 });
      mock.mockAll.mockResolvedValueOnce({
        results: [{
          id: 'u1',
          username: 'user1',
          email: 'u1@test.com',
          display_name: '用户1',
          family_role: '妈妈',
          is_admin: 0,
          status: 'approved',
          avatar_url: null,
          created_at: '2024-01-01',
        }],
      });

      const result = await service.listUsers(undefined, 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].displayName).toBe('用户1');
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('approveUser', () => {
    it('should approve a pending user', async () => {
      mock.mockRun.mockResolvedValueOnce({ meta: { changes: 1 } });

      const result = await service.approveUser('u1', 'approve');
      expect(result.message).toBe('已通过审批');
    });

    it('should throw when user not found or not pending', async () => {
      mock.mockRun.mockResolvedValueOnce({ meta: { changes: 0 } });

      await expect(service.approveUser('u1', 'approve')).rejects.toThrow('用户不存在或状态不是待审批');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      mock.mockFirst.mockResolvedValueOnce(null); // no duplicate

      const result = await service.createUser({
        username: 'newuser',
        email: 'new@test.com',
        password: 'pass123456',
        displayName: '新用户',
        familyRole: '儿子',
      });

      expect(result.id).toBeDefined();
      expect(hashPassword).toHaveBeenCalledWith('pass123456');
    });

    it('should throw DUPLICATE when username/email exists', async () => {
      mock.mockFirst.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.createUser({
          username: 'existing',
          email: 'exists@test.com',
          password: 'pass123',
          displayName: '已有用户',
        }),
      ).rejects.toThrow('用户名或邮箱已被注册');
    });
  });

  describe('updateUser', () => {
    it('should throw when no fields provided', async () => {
      await expect(service.updateUser('u1', {})).rejects.toThrow('没有提供更新字段');
    });
  });

  describe('changePassword', () => {
    it('should throw NOT_FOUND when user does not exist', async () => {
      mock.mockFirst.mockResolvedValueOnce(null);

      await expect(
        service.changePassword('u1', 'old', 'new'),
      ).rejects.toThrow('用户不存在');
    });

    it('should throw UNAUTHORIZED when old password is wrong', async () => {
      mock.mockFirst.mockResolvedValueOnce({ password_hash: 'stored-hash' });
      (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      await expect(
        service.changePassword('u1', 'wrong', 'new'),
      ).rejects.toThrow('原密码错误');
    });
  });

  describe('getFamilyMembers', () => {
    it('should return all approved members', async () => {
      mock.mockAll.mockResolvedValueOnce({
        results: [
          { id: 'u1', display_name: '爸爸', family_role: '爸爸', avatar_url: null },
          { id: 'u2', display_name: '妈妈', family_role: '妈妈', avatar_url: null },
        ],
      });

      const members = await service.getFamilyMembers();
      expect(members).toHaveLength(2);
      expect(members[0].displayName).toBe('爸爸');
    });
  });
});

describe('ServiceError', () => {
  it('should have correct properties', () => {
    const err = new ServiceError('NOT_FOUND', '资源不存在', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('资源不存在');
    expect(err.status).toBe(404);
    expect(err.name).toBe('ServiceError');
    expect(err).toBeInstanceOf(Error);
  });
});
