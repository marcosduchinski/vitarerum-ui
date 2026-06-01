import { expect, test } from '@playwright/test';

async function loginAs(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('any');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/p/dashboard');
}

const sidebar = (page: import('@playwright/test').Page) => page.locator('.layout-sidebar');

test('EXTERNAL role shows proposals/projects sections, hides staff items', async ({ page }) => {
  await loginAs(page, 'alice@ext.example.com');
  await page.screenshot({ path: '/tmp/nav-external.png', fullPage: true });

  await expect(sidebar(page).getByText('Use of Collections')).toBeVisible();
  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'Submit proposal' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My proposals' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'New' })).not.toBeVisible();
  await sidebar(page).getByRole('button', { name: 'Projects' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'My projects' })).toBeVisible();
  // Switcher shows but has only one option (Alice belongs to EXTERNAL only)
  const options = await page.locator('#role-switcher option').allTextContents();
  expect(options).toHaveLength(1);
  expect(options[0]).toBe('External researcher');
});

test('COLLECTIONS_MANAGEMENT user sees expandable collection-use section', async ({ page }) => {
  await loginAs(page, 'bob@collections.example.com');
  await page.screenshot({ path: '/tmp/nav-staff.png', fullPage: true });

  await expect(sidebar(page).getByText('Use of Collections')).toBeVisible();

  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'New' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My assignments' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: "Other's assignments" })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Approved' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Rejected / cancelled' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Submit proposal' })).not.toBeVisible();

  await sidebar(page).getByRole('button', { name: 'Projects' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'Pending' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'In progress' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Completed / closed' })).toBeVisible();
});

test('DIRECTION user sees proposal terminal queues without administration links', async ({ page }) => {
  await loginAs(page, 'dan@direction.example.com');
  await page.screenshot({ path: '/tmp/nav-direction.png', fullPage: true });

  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await expect(sidebar(page).getByRole('link', { name: "Other's assignments" })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Approved' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Rejected / cancelled' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Users' })).not.toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Groups' })).not.toBeVisible();
});

test('ADMINISTRATION user can reach users and groups from the sidebar', async ({ page }) => {
  await loginAs(page, 'eve@admin.example.com');

  await expect(sidebar(page).getByText('Administration')).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Groups' })).toBeVisible();

  await sidebar(page).getByRole('link', { name: 'Users' }).click();
  await expect(page).toHaveURL(/\/p\/admin\/users$/);

  await sidebar(page).getByRole('link', { name: 'Groups' }).click();
  await expect(page).toHaveURL(/\/p\/admin\/groups$/);
});

test('Dashboard link carries aria-current=page', async ({ page }) => {
  await loginAs(page, 'alice@ext.example.com');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
});

test('mobile 375px: hamburger toggles sidebar overlay', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await loginAs(page, 'alice@ext.example.com');
  await page.screenshot({ path: '/tmp/nav-mobile-closed.png', fullPage: true });

  const nav = sidebar(page);
  await expect(nav).not.toBeInViewport();

  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.screenshot({ path: '/tmp/nav-mobile-open.png', fullPage: true });
  await expect(nav).toBeInViewport();
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});

test('keyboard: Tab from page body reaches focusable topbar elements', async ({ page }) => {
  await loginAs(page, 'alice@ext.example.com');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
});

test('multi-group user sees only their 3 groups in the switcher and can switch between them', async ({ page }) => {
  await loginAs(page, 'fran@staff.example.com');
  await page.screenshot({ path: '/tmp/nav-fran-initial.png', fullPage: true });

  // Switcher is visible and shows exactly 3 options
  const switcher = page.locator('#role-switcher');
  await expect(switcher).toBeVisible();
  const options = await switcher.locator('option').allTextContents();
  expect(options).toHaveLength(3);
  expect(options).toContain('Collections management');
  expect(options).toContain('Curatorial');
  expect(options).toContain('Direction');
  // ADMIN is not one of Fran's groups
  expect(options).not.toContain('Administrator');

  // Switch to Curatorial — nav remains collection-use scoped
  await page.selectOption('#role-switcher', 'CURATORIAL');
  await page.screenshot({ path: '/tmp/nav-fran-curatorial.png', fullPage: true });
  const sb = page.locator('.layout-sidebar');
  await sb.getByRole('button', { name: 'Proposals' }).click();
  await expect(sb.getByRole('link', { name: 'My assignments' })).toBeVisible();
  await expect(sb.getByRole('link', { name: 'Approved' })).toBeVisible();

  // Switch to Direction — admin routes remain hidden
  await page.selectOption('#role-switcher', 'DIRECTION');
  await expect(sb.getByRole('link', { name: 'Rejected / cancelled' })).toBeVisible();
  await expect(sb.getByRole('link', { name: 'Users' })).not.toBeVisible();
});

test('approved proposal action menu can navigate to the related project', async ({ page }) => {
  await loginAs(page, 'bob@collections.example.com');

  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await sidebar(page).getByRole('link', { name: 'Approved' }).click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/approved$/);
  await expect(page.getByRole('heading', { name: 'Approved' })).toBeVisible();

  await page.getByRole('button', { name: /More actions for/ }).first().click();
  await page.getByRole('menuitem', { name: 'Go to project' }).click();

  await expect(page).toHaveURL(/\/p\/collections\/projects\/.+returnTo=%2Fp%2Fcollections%2Fproposals%2Fapproved/);
  await expect(page.getByRole('link', { name: 'Back to approved proposals' })).toBeVisible();
});
