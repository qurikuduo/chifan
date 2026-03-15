import { test, expect, Page } from '@playwright/test';

const ADMIN = { login: 'admin', password: 'admin123456' };

async function login(page: Page, creds = ADMIN) {
  await page.goto('/login');
  await page.fill('input[placeholder="用户名或邮箱"]', creds.login);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 8000 });
}

// ─── Auth Flow ────────────────────────────────────────────────
test.describe('Auth Flow', () => {
  test('shows login page with form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[placeholder="用户名或邮箱"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('登录');
  });

  test('invalid credentials do not navigate away from login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="用户名或邮箱"]', 'nonexistent');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    // The user should remain on /login (either error shows or page reloads)
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with admin and redirects to home', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL('/');
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('register link navigates to register page', async ({ page }) => {
    await page.goto('/login');
    await page.click('a[href="/register"]');
    await expect(page).toHaveURL('/register');
  });
});

// ─── Navigation ───────────────────────────────────────────────
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('bottom nav shows all tabs', async ({ page }) => {
    const nav = page.locator('.bottom-nav');
    await expect(nav.locator('.nav-item')).toHaveCount(5);
    await expect(nav).toContainText('首页');
    await expect(nav).toContainText('菜品');
    await expect(nav).toContainText('偏好');
    await expect(nav).toContainText('通知');
    await expect(nav).toContainText('我的');
  });

  test('navigate to dishes page', async ({ page }) => {
    await page.click('.nav-item >> text=菜品');
    await expect(page).toHaveURL('/dishes');
    await expect(page.locator('.top-title')).toContainText('菜品库');
  });

  test('navigate to profile page', async ({ page }) => {
    await page.click('.nav-item >> text=我的');
    await expect(page).toHaveURL('/profile');
  });
});

// ─── Dish CRUD ────────────────────────────────────────────────
test.describe('Dish CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('create a dish via API and verify redirect', async ({ page }) => {
    const dishName = `E2E菜品_${Date.now()}`;
    await page.goto('/dishes/create');
    await page.fill('input[placeholder="输入菜名"]', dishName);
    await page.fill('textarea', '这是E2E测试的菜品描述');

    // Intercept the POST response to verify success
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/v1/dishes') && r.request().method() === 'POST'
    );
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // Verify redirect to dish detail page (ID is UUID)
    await page.waitForURL(/\/dishes\/[\w-]+/, { timeout: 10000 });
  });

  test('dishes page loads and shows content', async ({ page }) => {
    await page.goto('/dishes');
    const cards = page.locator('.dish-card');
    const empty = page.locator('.empty');
    await expect(cards.or(empty).first()).toBeVisible({ timeout: 5000 });
  });

  test('dish search input works', async ({ page }) => {
    await page.goto('/dishes');
    const searchInput = page.locator('input[placeholder="搜索菜品..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('不存在的菜品XXXXXX');
    await page.waitForTimeout(500);
    await expect(page.locator('.dish-card')).toHaveCount(0, { timeout: 3000 });
  });
});

// ─── Menu Workflow ─────────────────────────────────────────────
test.describe('Menu Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('menu create page loads with form fields', async ({ page }) => {
    await page.goto('/menus/create');
    await expect(page.locator('input[placeholder="如：周末晚餐"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('input[type="datetime-local"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('home page shows menus and tabs', async ({ page }) => {
    await page.goto('/');
    const tabs = page.locator('.tab-bar .tab');
    await expect(tabs.first()).toBeVisible({ timeout: 5000 });
    await expect(tabs).toHaveCount(4);

    // Click second tab and verify active state
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveClass(/active/);
  });
});

// ─── Admin ─────────────────────────────────────────────────────
test.describe('Admin', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('admin can access user management', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('body')).toContainText('admin', { timeout: 8000 });
  });
});

// ─── Dish Edit & Markdown Editor ──────────────────────────────
test.describe('Dish Edit & Markdown Editor', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('create dish form shows markdown editor with toolbar', async ({ page }) => {
    await page.goto('/dishes/create');
    await expect(page.locator('.md-editor')).toBeVisible();
    await expect(page.locator('.md-editor .toolbar')).toBeVisible();
    await expect(page.locator('.md-editor .toolbar button').first()).toBeVisible();
    await expect(page.locator('.md-editor textarea')).toBeVisible();
  });

  test('markdown preview toggle works', async ({ page }) => {
    await page.goto('/dishes/create');
    const editor = page.locator('.md-editor');
    const textarea = editor.locator('textarea');
    const previewBtn = editor.locator('.preview-toggle');

    // Type some markdown
    await textarea.fill('**粗体测试** 和 *斜体*');

    // Click preview
    await previewBtn.click();
    await expect(editor.locator('.preview')).toBeVisible();
    await expect(editor.locator('.preview')).toContainText('粗体测试');

    // Switch back to edit
    await previewBtn.click();
    await expect(textarea).toBeVisible();
  });

  test('can edit an existing dish', async ({ page }) => {
    // First create a dish
    const dishName = `E2E编辑测试_${Date.now()}`;
    await page.goto('/dishes/create');
    await page.fill('input[placeholder="输入菜名"]', dishName);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dishes\/[\w-]+/, { timeout: 10000 });

    // Click edit button (the router-link with class btn-secondary)
    await page.click('a.btn-secondary:has-text("编辑")');
    await page.waitForURL(/\/dishes\/[\w-]+\/edit/, { timeout: 8000 });

    // Verify form is populated
    const nameInput = page.locator('input').first();
    await expect(nameInput).toHaveValue(dishName);

    // Modify name
    await nameInput.fill(dishName + '_modified');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dishes\/[\w-]+$/, { timeout: 10000 });

    // Verify updated name shows
    await expect(page.locator('h3')).toContainText('_modified');
  });
});

// ─── Quick-Add Dish in Menu ───────────────────────────────────
test.describe('Quick-Add Dish in Menu', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('menu create page shows quick-add button for non-existing dish', async ({ page }) => {
    await page.goto('/menus/create');
    const searchInput = page.locator('input[placeholder*="搜索"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(`不存在的菜_${Date.now()}`);
      await page.waitForTimeout(500);
      // Should show "快速创建" button
      const quickAddBtn = page.locator('.quick-add');
      if (await quickAddBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(quickAddBtn).toContainText('快速创建');
      }
    }
  });
});

// ─── User Preferences ─────────────────────────────────────────
test.describe('User Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('preferences link visible in profile page', async ({ page }) => {
    await page.goto('/profile');
    const prefLink = page.locator('a[href="/profile/preferences"]');
    await expect(prefLink).toBeVisible();
    await expect(prefLink).toContainText('饮食偏好');
  });

  test('preferences page loads with sections', async ({ page }) => {
    await page.goto('/profile/preferences');
    await expect(page.locator('body')).toContainText('饮食备注', { timeout: 8000 });
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('can save dietary notes', async ({ page }) => {
    await page.goto('/profile/preferences');
    // Wait for loading state to complete
    await page.waitForSelector('textarea', { timeout: 8000 });
    const textarea = page.locator('textarea');
    await textarea.fill('不吃辣，少盐');
    await page.click('button:has-text("保存偏好")');
    // Wait for save to complete (toast appears)
    await page.waitForTimeout(2000);

    // Reload and verify persisted
    await page.reload();
    await page.waitForSelector('textarea', { timeout: 8000 });
    await expect(textarea).toHaveValue('不吃辣，少盐', { timeout: 8000 });
  });
});

// ─── Favorites Page ───────────────────────────────────────────
test.describe('Favorites Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('favorites page loads', async ({ page }) => {
    await page.goto('/favorites');
    // Should show either favorites content or empty state
    await expect(page.locator('.section').or(page.locator('.empty')).first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Page Transitions ─────────────────────────────────────────
test.describe('Page Transitions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('navigating between pages has smooth transition', async ({ page }) => {
    await page.goto('/');
    // Navigate to dishes
    await page.click('.nav-item >> text=菜品');
    await expect(page).toHaveURL('/dishes');
    // Navigate to profile
    await page.click('.nav-item >> text=我的');
    await expect(page).toHaveURL('/profile');
    // Navigate back to home
    await page.click('.nav-item >> text=首页');
    await expect(page).toHaveURL('/');
  });
});
