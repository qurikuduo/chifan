import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import Login from '@/views/Login.vue';

// Mock vue-router
const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => ({ path: '/login' }),
}));

const RouterLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
};

// Mock auth store
const loginMock = vi.fn();
vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login: loginMock,
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
        app: { name: '吃饭' },
        auth: {
          username_or_email: '用户名或邮箱',
          password: '密码',
          login: '登录',
          logging_in: '登录中...',
          no_account: '没有账号？',
          go_register: '去注册',
        },
      },
    },
  });

  return mount(Login, {
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('Login.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('should render login form', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.findAll('input')).toHaveLength(2);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it('should show app name in header', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('h1').text()).toContain('吃饭');
  });

  it('should bind v-model to username and password inputs', async () => {
    const wrapper = createWrapper();
    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('testuser');
    await inputs[1].setValue('password123');

    // The inputs should have the set values
    expect((inputs[0].element as HTMLInputElement).value).toBe('testuser');
    expect((inputs[1].element as HTMLInputElement).value).toBe('password123');
  });

  it('should call auth.login on form submit', async () => {
    loginMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('testuser');
    await inputs[1].setValue('password123');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith({
      login: 'testuser',
      password: 'password123',
    });
  });

  it('should redirect to / after successful login', async () => {
    loginMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('user');
    await inputs[1].setValue('pass');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('should show error message on login failure', async () => {
    loginMock.mockRejectedValue(new Error('用户名或密码错误'));
    const wrapper = createWrapper();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('wrong');
    await inputs[1].setValue('wrong');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.error-msg').exists()).toBe(true);
    expect(wrapper.find('.error-msg').text()).toBe('用户名或密码错误');
  });

  it('should disable button during loading', async () => {
    let resolveLogin: () => void;
    loginMock.mockReturnValue(new Promise<void>((r) => { resolveLogin = r; }));
    const wrapper = createWrapper();

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('user');
    await inputs[1].setValue('pass');
    await wrapper.find('form').trigger('submit');

    // Button should be disabled during loading
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();

    resolveLogin!();
    await flushPromises();
  });

  it('should have link to register page', () => {
    const wrapper = createWrapper();
    // RouterLink stub renders as <a :href="to">
    const links = wrapper.findAll('a');
    const registerLink = links.find((l) => l.attributes('href') === '/register');
    expect(registerLink).toBeDefined();
  });
});
