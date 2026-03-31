import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import DishList from '@/views/DishList.vue';

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
  useRoute: () => ({ path: '/dishes' }),
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

const messages = {
  zh: {
    app: { name: '吃饭' },
    dishes: {
      title: '菜品库',
      create: '新建',
      create_dish: '创建菜品',
      search: '搜索菜品...',
      empty_hint: '还没有菜品，点击上方按钮创建',
    },
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
  return mount(DishList, {
    global: {
      plugins: [createPinia(), i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
}

describe('DishList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('should render search input', async () => {
    getMock.mockResolvedValue({ data: [], pagination: { totalPages: 1 } });
    const wrapper = createWrapper();
    await flushPromises();

    const searchInput = wrapper.find('.search-bar input');
    expect(searchInput.exists()).toBe(true);
  });

  it('should render create dish link', () => {
    getMock.mockResolvedValue({ data: [], pagination: { totalPages: 1 } });
    const wrapper = createWrapper();
    const links = wrapper.findAll('a');
    const createLink = links.find((l) => l.attributes('href') === '/dishes/create');
    expect(createLink).toBeDefined();
  });

  it('should display dish list from API', async () => {
    // First call returns tags, second call returns dishes
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) {
        return Promise.resolve([{ id: 't1', name: '中餐' }]);
      }
      return Promise.resolve({
        data: [
          {
            id: 'd1',
            name: '红烧牛肉',
            description: '经典家常菜',
            defaultPhoto: null,
            tags: [{ id: 't1', name: '中餐' }],
            ingredients: [],
            cookingMethods: [],
            createdAt: '2026-03-31',
          },
        ],
        pagination: { totalPages: 1 },
      });
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('红烧牛肉');
  });

  it('should show empty state when no dishes', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) return Promise.resolve([]);
      return Promise.resolve({ data: [], pagination: { totalPages: 1 } });
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('还没有菜品');
  });

  it('should render tag filter chips', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) {
        return Promise.resolve([
          { id: 't1', name: '中餐' },
          { id: 't2', name: '西餐' },
        ]);
      }
      return Promise.resolve({ data: [], pagination: { totalPages: 1 } });
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.text()).toContain('中餐');
    expect(wrapper.text()).toContain('西餐');
  });

  it('should link each dish to its detail page', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) return Promise.resolve([]);
      return Promise.resolve({
        data: [
          {
            id: 'dish-abc',
            name: '味增汤',
            description: null,
            defaultPhoto: null,
            tags: [],
            ingredients: [],
            cookingMethods: [],
            createdAt: '2026-03-31',
          },
        ],
        pagination: { totalPages: 1 },
      });
    });

    const wrapper = createWrapper();
    await flushPromises();

    const links = wrapper.findAll('a');
    const dishLink = links.find((l) => l.attributes('href') === '/dishes/dish-abc');
    expect(dishLink).toBeDefined();
  });

  it('should show pagination when multiple pages', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) return Promise.resolve([]);
      return Promise.resolve({ data: [], pagination: { totalPages: 3 } });
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(true);
    expect(wrapper.text()).toContain('1 / 3');
  });

  it('should not show pagination for single page', async () => {
    getMock.mockImplementation((path: string) => {
      if (path.startsWith('/tags')) return Promise.resolve([]);
      return Promise.resolve({ data: [], pagination: { totalPages: 1 } });
    });

    const wrapper = createWrapper();
    await flushPromises();

    expect(wrapper.find('.pagination').exists()).toBe(false);
  });
});
