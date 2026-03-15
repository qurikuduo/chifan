import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  // === 公开页面 ===
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { public: true },
  },

  // === 需要登录的页面 ===
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
  },
  {
    path: '/menus/create',
    name: 'MenuCreate',
    component: () => import('@/views/MenuCreate.vue'),
  },
  {
    path: '/menus/:id',
    name: 'MenuDetail',
    component: () => import('@/views/MenuDetail.vue'),
  },
  {
    path: '/menus/:id/manage',
    name: 'MenuManage',
    component: () => import('@/views/MenuManage.vue'),
  },
  {
    path: '/menus/:id/print',
    name: 'MenuPrint',
    component: () => import('@/views/MenuPrint.vue'),
  },
  {
    path: '/dishes',
    name: 'DishList',
    component: () => import('@/views/DishList.vue'),
  },
  {
    path: '/dishes/create',
    name: 'DishCreate',
    component: () => import('@/views/DishCreate.vue'),
  },
  {
    path: '/dishes/:id',
    name: 'DishDetail',
    component: () => import('@/views/DishDetail.vue'),
  },
  {
    path: '/dishes/:id/edit',
    name: 'DishEdit',
    component: () => import('@/views/DishEdit.vue'),
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/views/Notifications.vue'),
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('@/views/Favorites.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    component: () => import('@/views/ProfileEdit.vue'),
  },
  {
    path: '/profile/preferences',
    name: 'Preferences',
    component: () => import('@/views/Preferences.vue'),
  },
  {
    path: '/profile/password',
    name: 'ChangePassword',
    component: () => import('@/views/ChangePassword.vue'),
  },
  {
    path: '/help',
    name: 'Help',
    component: () => import('@/views/Help.vue'),
  },

  // === 管理后台 ===
  {
    path: '/admin',
    name: 'AdminHome',
    component: () => import('@/views/admin/AdminHome.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/users',
    name: 'UserManage',
    component: () => import('@/views/admin/UserManage.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/users/create',
    name: 'UserCreate',
    component: () => import('@/views/admin/UserCreate.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/ingredients',
    name: 'IngredientManage',
    component: () => import('@/views/admin/IngredientManage.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/ingredient-categories',
    name: 'IngredientCategoryManage',
    component: () => import('@/views/admin/IngredientCategoryManage.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/cooking-methods',
    name: 'CookingMethodManage',
    component: () => import('@/views/admin/CookingMethodManage.vue'),
    meta: { admin: true },
  },
  {
    path: '/admin/tags',
    name: 'TagManage',
    component: () => import('@/views/admin/TagManage.vue'),
    meta: { admin: true },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  const isPublic = to.meta.public;

  if (!isPublic && !token) {
    next('/login');
    return;
  }

  if (to.meta.admin) {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user?.isAdmin) {
        next('/');
        return;
      }
    } catch {
      next('/login');
      return;
    }
  }

  next();
});
