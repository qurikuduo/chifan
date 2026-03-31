import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import Register from '@/views/Register.vue';

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/register' }),
}));

const RouterLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
};

// Mock auth store
const registerMock = vi.fn();
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    register: registerMock,
    isLoggedIn: false,
    isAdmin: false,
    token: null,
    user: null,
  }),
}));

function createWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh',
    messages: {
      zh: {
        auth: {
          register_title: '注册',
          username: '用户名',
          email: '邮箱',
          display_name: '显示名称',
          password: '密码',
          confirm_password: '确认密码',
          register: '注册',
          registering: '注册中...',
          has_account: '已有账号？',
          go_login: '去登录',
          password_mismatch: '两次密码不一致',
          register_pending: '注册成功，等待管理员审批',
          register_failed: '注册失败',
        },
      },
    },
  });

  return mount(Register, {
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('Register.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('should render registration form with 5 inputs', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.findAll('input')).toHaveLength(5);
  });

  it('should show title', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('h1').text()).toBe('注册');
  });

  it('should validate password mismatch', async () => {
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');
    // username, email, displayName, password, confirmPassword
    await inputs[0].setValue('user1');
    await inputs[1].setValue('test@test.com');
    await inputs[2].setValue('User 1');
    await inputs[3].setValue('password123');
    await inputs[4].setValue('different');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-msg').text()).toBe('两次密码不一致');
    expect(registerMock).not.toHaveBeenCalled();
  });

  it('should call register on valid submission', async () => {
    registerMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('newuser');
    await inputs[1].setValue('new@test.com');
    await inputs[2].setValue('New User');
    await inputs[3].setValue('password123');
    await inputs[4].setValue('password123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(registerMock).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@test.com',
      displayName: 'New User',
      password: 'password123',
    });
  });

  it('should show success message after registration', async () => {
    registerMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('user');
    await inputs[1].setValue('u@t.com');
    await inputs[2].setValue('User');
    await inputs[3].setValue('pass123');
    await inputs[4].setValue('pass123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.success-msg').text()).toBe('注册成功，等待管理员审批');
  });

  it('should show error message on registration failure', async () => {
    registerMock.mockRejectedValue(new Error('用户名已存在'));
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('taken');
    await inputs[1].setValue('t@t.com');
    await inputs[2].setValue('Taken');
    await inputs[3].setValue('pass123');
    await inputs[4].setValue('pass123');

    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-msg').text()).toBe('用户名已存在');
  });

  it('should have link to login page', () => {
    const wrapper = createWrapper();
    const links = wrapper.findAll('a');
    const loginLink = links.find((l) => l.attributes('href') === '/login');
    expect(loginLink).toBeDefined();
  });

  it('should disable button during submission', async () => {
    let resolveRegister: () => void;
    registerMock.mockReturnValue(new Promise<void>((r) => { resolveRegister = r; }));
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');

    await inputs[0].setValue('u');
    await inputs[1].setValue('u@t.com');
    await inputs[2].setValue('U');
    await inputs[3].setValue('pass123');
    await inputs[4].setValue('pass123');

    await wrapper.find('form').trigger('submit');
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    resolveRegister!();
    await flushPromises();
  });
});
