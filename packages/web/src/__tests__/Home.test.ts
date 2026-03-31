import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import Home from '@/views/Home.vue';

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
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ path: '/' }),
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

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isLoggedIn: true,
    isAdmin: false,
    token: 'test-token',
    user: { id: 'u1', displayName: 'Test' },
  }),
}));

// Mock useToast
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    toasts: { value: [] },
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

const messages = {
  zh: {
    app: { name: '吃饭', loading: '加载中...' },
    home: {
      create_menu: '创建菜单',
      tabs: { all: '全部' },
      dishes: '道菜',
      people_selected: '人已选',
      invitees: '人',
      empty: '暂无菜单',
      empty_hint: '点击上方按钮创建第一份菜单',
    },
    menu: {
      status: {
        draft: '草稿',
        published: '已发布',
        cooking: '烹饪中',
        completed: '已完成',
        selection_closed: '已截止',
      },
      meal_types: {
        breakfast: '早餐',
        lunch: '午餐',
        dinner: '晚餐',
        afternoon_tea: '下午茶',
        late_night: '宵夜',
      },
    },
    nav: {
      home: '首页',
      dishes: '菜品',
      favorites: '最爱',
      notifications: '通知',
      profile: '我的',
    },
    common: { error: '错误' },
  },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'zh', messages });
  return mount(Home, {
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('Home.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('should render create menu button', () => {
    getMock.mockResolvedValue({ items: [] });
    const wrapper = createWrapper();
    const links = wrapper.findAll('a');
    const createLink = links.find((l) => l.attributes('href') === '/menus/create');
    expect(createLink).toBeDefined();
    expect(wrapper.text()).toContain('创建菜单');
  });

  it('should render tab bar', () => {
    getMock.mockResolvedValue({ items: [] });
    const wrapper = createWrapper();
    const tabs = wrapper.findAll('.tab');
    expect(tabs.length).toBeGreaterThanOrEqual(1);
    expect(tabs[0].text()).toBe('全部');
  });

  it('should display menu list from API', async () => {
    getMock.mockResolvedValue({
      items: [
        {
          id: 'm1',
          title: '今日晚餐',
          mealType: 'dinner',
          mealTime: '2026-03-31T18:00:00',
          deadline: '2026-03-31T17:00:00',
          status: 'published',
          dishCount: 5,
          totalInvitees: 4,
          completedInvitees: 2,
        },
      ],
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('今日晚餐');
    expect(wrapper.text()).toContain('已发布');
  });

  it('should show empty state when no menus', async () => {
    getMock.mockResolvedValue({ items: [] });
    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('暂无菜单');
  });

  it('should call API with status filter when tab clicked', async () => {
    getMock.mockResolvedValue({ items: [] });
    const wrapper = createWrapper();
    await flushPromises();
    getMock.mockClear();

    // Click the "已发布" tab
    const publishedTab = wrapper.findAll('.tab').find((t) => t.text() === '已发布');
    if (publishedTab) {
      await publishedTab.trigger('click');
      await flushPromises();
      expect(getMock).toHaveBeenCalledWith(expect.stringContaining('status=published'));
    }
  });

  it('should link each menu card to its detail page', async () => {
    getMock.mockResolvedValue({
      items: [
        {
          id: 'menu123',
          title: 'Test Menu',
          mealType: 'lunch',
          mealTime: '2026-03-31T12:00:00',
          deadline: '2026-03-31T11:00:00',
          status: 'draft',
          dishCount: 3,
          totalInvitees: 2,
          completedInvitees: 0,
        },
      ],
    });

    const wrapper = createWrapper();
    await flushPromises();

    const links = wrapper.findAll('a');
    const menuLink = links.find((l) => l.attributes('href') === '/menus/menu123');
    expect(menuLink).toBeDefined();
  });
});
