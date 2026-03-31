import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import ChangePassword from '@/views/ChangePassword.vue';

// Mock api
const putMock = vi.fn();
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: (...args: unknown[]) => putMock(...args),
    delete: vi.fn(),
  },
}));

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ path: '/profile/password' }),
  RouterLink: {
    template: '<a :href="to"><slot /></a>',
    props: ['to'],
  },
}));

// Mock stores
vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    unreadCount: 0,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    fetchUnreadCount: vi.fn(),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isLoggedIn: true,
    isAdmin: false,
    token: 'test-token',
    user: { id: 'u1', displayName: 'Test' },
  }),
}));

const messages = {
  zh: {
    profile: {
      change_password: '修改密码',
      old_password: '旧密码',
      new_password: '新密码',
      confirm_new_password: '确认新密码',
      password_mismatch: '两次密码不一致',
      password_changed: '密码修改成功',
    },
    common: { submitting: '提交中...', error: '操作失败' },
    nav: {
      home: '首页',
      dishes: '菜品',
      favorites: '最爱',
      notifications: '通知',
      profile: '我的',
    },
  },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'zh', messages });
  return mount(ChangePassword, {
    global: {
      plugins: [createPinia(), i18n],
    },
  });
}

describe('ChangePassword.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('should render 3 password inputs', () => {
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');
    expect(inputs).toHaveLength(3);
  });

  it('should validate password mismatch', async () => {
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');
    await inputs[0].setValue('oldpass');
    await inputs[1].setValue('newpass123');
    await inputs[2].setValue('different');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-msg').text()).toBe('两次密码不一致');
    expect(putMock).not.toHaveBeenCalled();
  });

  it('should call API on valid submission', async () => {
    putMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');

    await inputs[0].setValue('oldpass');
    await inputs[1].setValue('newpass123');
    await inputs[2].setValue('newpass123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(putMock).toHaveBeenCalledWith('/users/me/password', {
      oldPassword: 'oldpass',
      newPassword: 'newpass123',
    });
  });

  it('should show success message after password change', async () => {
    putMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');

    await inputs[0].setValue('oldpass');
    await inputs[1].setValue('newpass123');
    await inputs[2].setValue('newpass123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.success-msg').text()).toBe('密码修改成功');
  });

  it('should show error message on API failure', async () => {
    putMock.mockRejectedValue(new Error('旧密码错误'));
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');

    await inputs[0].setValue('wrong');
    await inputs[1].setValue('newpass');
    await inputs[2].setValue('newpass');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-msg').text()).toBe('旧密码错误');
  });

  it('should clear form after successful change', async () => {
    putMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input[type="password"]');

    await inputs[0].setValue('old');
    await inputs[1].setValue('new123');
    await inputs[2].setValue('new123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    // After success, inputs should be cleared
    expect((inputs[0].element as HTMLInputElement).value).toBe('');
    expect((inputs[1].element as HTMLInputElement).value).toBe('');
    expect((inputs[2].element as HTMLInputElement).value).toBe('');
  });
});
