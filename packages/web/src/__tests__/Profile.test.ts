import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import Profile from '@/views/Profile.vue';

// Mock api
const getMock = vi.fn();
vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock vue-router
const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
  useRoute: () => ({ path: '/profile' }),
}));

const RouterLinkStub = {
  template: '<a :href="to"><slot /></a>',
  props: ['to'],
};

// Mock stores
vi.mock('@/stores/notification', () => ({
  useNotificationStore: () => ({
    unreadCount: 0,
    startPolling: vi.fn(),
    stopPolling: vi.fn(),
    fetchUnreadCount: vi.fn(),
  }),
}));

const logoutMock = vi.fn();
let isAdminValue = false;

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isLoggedIn: true,
    isAdmin: isAdminValue,
    token: 'mock-token',
    user: {
      id: 'u1',
      username: 'testuser',
      email: 'test@example.com',
      displayName: '测试用户',
      familyRole: null,
      isAdmin: false,
      avatarUrl: null,
    },
    logout: logoutMock,
  }),
}));

const mockUser = {
  id: 'u1',
  username: 'testuser',
  email: 'test@example.com',
  displayName: '测试用户',
  familyRole: null,
  isAdmin: false,
  avatarUrl: null,
};

function createWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'zh',
    messages: {
      zh: {
        profile: {
          title: '个人中心',
          edit: '编辑个人信息',
          change_password: '修改密码',
          dietary_prefs: '🍽 饮食偏好设置',
          help: '📖 使用帮助',
          admin: '管理后台',
          admin_badge: '管理员',
        },
        auth: { logout: '退出登录' },
        common: { language: '语言' },
        nav: {
          home: '首页',
          dishes: '菜品',
          favorites: '偏好',
          notifications: '通知',
          profile: '我的',
        },
      },
    },
  });

  return mount(Profile, {
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('Profile.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    isAdminValue = false;
    getMock.mockResolvedValue({ ...mockUser });
  });

  it('should render user profile card after loading', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.profile-avatar').text()).toBe('测');
    expect(wrapper.find('.profile-info h3').text()).toBe('测试用户');
    expect(wrapper.text()).toContain('testuser');
    expect(wrapper.text()).toContain('test@example.com');
  });

  it('should show family role when present', async () => {
    getMock.mockResolvedValue({ ...mockUser, familyRole: '爸爸' });
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.family-role').text()).toBe('爸爸');
  });

  it('should show admin badge when user is admin', async () => {
    getMock.mockResolvedValue({ ...mockUser, isAdmin: true });
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.badge-admin').exists()).toBe(true);
    expect(wrapper.find('.badge-admin').text()).toBe('管理员');
  });

  it('should not show admin badge for regular user', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.badge-admin').exists()).toBe(false);
  });

  it('should render action buttons', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const links = wrapper.findAll('a');
    const hrefs = links.map((l) => l.attributes('href'));
    expect(hrefs).toContain('/profile/edit');
    expect(hrefs).toContain('/profile/password');
    expect(hrefs).toContain('/profile/preferences');
    expect(hrefs).toContain('/help');
  });

  it('should show admin link when user is admin', async () => {
    isAdminValue = true;
    const wrapper = createWrapper();
    await flushPromises();

    const links = wrapper.findAll('a');
    const hrefs = links.map((l) => l.attributes('href'));
    expect(hrefs).toContain('/admin');
  });

  it('should not show admin link for non-admin', async () => {
    isAdminValue = false;
    const wrapper = createWrapper();
    await flushPromises();

    const links = wrapper.findAll('a');
    const hrefs = links.map((l) => l.attributes('href'));
    expect(hrefs).not.toContain('/admin');
  });

  it('should call logout and redirect on logout button click', async () => {
    logoutMock.mockResolvedValue(undefined);
    const wrapper = createWrapper();
    await flushPromises();

    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();

    expect(logoutMock).toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('should render language selector with options', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    const select = wrapper.find('.language-selector select');
    expect(select.exists()).toBe(true);
    const options = select.findAll('option');
    expect(options.length).toBeGreaterThanOrEqual(2);
  });

  it('should display version number', async () => {
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.version-tag').exists()).toBe(true);
    expect(wrapper.find('.version-tag').text()).toContain('v');
  });

  it('should fetch user data from API on mount', async () => {
    createWrapper();
    await flushPromises();

    expect(getMock).toHaveBeenCalledWith('/auth/me');
  });

  it('should fallback to auth store user if API fails', async () => {
    getMock.mockRejectedValue(new Error('Network error'));
    const wrapper = createWrapper();
    await flushPromises();

    // Should still render user data from auth store fallback
    expect(wrapper.find('.profile-info h3').text()).toBe('测试用户');
  });
});
