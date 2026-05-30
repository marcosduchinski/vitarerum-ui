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

  await expect(sidebar(page).getByRole('link', { name: 'New proposal' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My proposals' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My projects' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Staff queue' })).not.toBeVisible();
  await expect(sidebar(page).getByText('Administration')).not.toBeVisible();
  // Switcher shows but has only one option (Alice belongs to EXTERNAL only)
  const options = await page.locator('#role-switcher option').allTextContents();
  expect(options).toHaveLength(1);
  expect(options[0]).toBe('External researcher');
});

test('COLLECTIONS_MANAGEMENT user sees expandable collection-use section', async ({ page }) => {
  await loginAs(page, 'bob@collections.example.com');
  await page.screenshot({ path: '/tmp/nav-staff.png', fullPage: true });

  await expect(sidebar(page).getByText('Collection use')).toBeVisible();

  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'Staff queue' })).toBeVisible();

  await expect(sidebar(page).getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Groups' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'New proposal' })).not.toBeVisible();
});

test('DIRECTION user sees direction-only nav', async ({ page }) => {
  await loginAs(page, 'dan@direction.example.com');
  await page.screenshot({ path: '/tmp/nav-direction.png', fullPage: true });

  await expect(sidebar(page).getByRole('link', { name: 'Pending direction' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Approved' })).toBeVisible();
  await expect(sidebar(page).getByText('Administration')).not.toBeVisible();
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

  // Switch to Curatorial — nav changes
  await page.selectOption('#role-switcher', 'CURATORIAL');
  await page.screenshot({ path: '/tmp/nav-fran-curatorial.png', fullPage: true });
  const sb = page.locator('.layout-sidebar');
  await sb.getByRole('button', { name: 'Proposals' }).click();
  await expect(sb.getByRole('link', { name: 'Pending direction' })).toBeVisible();
  await expect(sb.getByRole('link', { name: 'Pending documents' })).not.toBeVisible();

  // Switch to Direction — nav changes again
  await page.selectOption('#role-switcher', 'DIRECTION');
  await expect(sb.getByRole('link', { name: 'Pending direction' })).toBeVisible();
  await expect(sb.getByRole('link', { name: 'Users' })).not.toBeVisible();
});
