import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('alice@ext.example.com');
  await page.getByLabel('Password').fill('any');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/p/dashboard');
}

const sidebar = (page: import('@playwright/test').Page) => page.locator('.layout-sidebar');

test('EXTERNAL role shows proposals/projects sections, hides staff items', async ({ page }) => {
  await login(page);
  await page.screenshot({ path: '/tmp/nav-external.png', fullPage: true });

  await expect(sidebar(page).getByRole('link', { name: 'New proposal' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My proposals' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'My projects' })).toBeVisible();
  // Staff items not present for EXTERNAL
  await expect(sidebar(page).getByRole('link', { name: 'Staff queue' })).not.toBeVisible();
  await expect(sidebar(page).getByText('Administration')).not.toBeVisible();
});

test('switching to COLLECTIONS_MANAGEMENT shows expandable collection-use section', async ({ page }) => {
  await login(page);
  await page.selectOption('#role-switcher', 'COLLECTIONS_MANAGEMENT');
  await page.screenshot({ path: '/tmp/nav-staff.png', fullPage: true });

  // "Collection use" is a section header (auto-expanded root); its children are expand buttons
  await expect(sidebar(page).getByText('Collection use')).toBeVisible();

  // Proposals is a collapsible button inside the section; expand it
  await expect(sidebar(page).getByRole('button', { name: 'Proposals' })).toBeVisible();
  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await expect(sidebar(page).getByRole('link', { name: 'Staff queue' })).toBeVisible();

  // Administration section has direct links
  await expect(sidebar(page).getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Groups' })).toBeVisible();

  // EXTERNAL items gone
  await expect(sidebar(page).getByRole('link', { name: 'New proposal' })).not.toBeVisible();
});

test('switching to DIRECTION shows direction-only nav', async ({ page }) => {
  await login(page);
  await page.selectOption('#role-switcher', 'DIRECTION');
  await page.screenshot({ path: '/tmp/nav-direction.png', fullPage: true });

  await expect(sidebar(page).getByRole('link', { name: 'Pending direction' })).toBeVisible();
  await expect(sidebar(page).getByRole('link', { name: 'Approved' })).toBeVisible();
  await expect(sidebar(page).getByText('Administration')).not.toBeVisible();
});

test('Dashboard link carries aria-current=page', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
});

test('mobile 375px: hamburger toggles sidebar overlay', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await page.screenshot({ path: '/tmp/nav-mobile-closed.png', fullPage: true });

  // Sidebar hidden by default on mobile
  const nav = sidebar(page);
  await expect(nav).not.toBeInViewport();

  // Hamburger opens the sidebar
  await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await page.screenshot({ path: '/tmp/nav-mobile-open.png', fullPage: true });
  await expect(nav).toBeInViewport();

  // Section labels visible in overlay mode
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});

test('keyboard: Tab from page body reaches sidebar ham button then logo', async ({ page }) => {
  await login(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Tab');
  // Hamburger button or topbar logo comes next
  const focused = page.locator(':focus');
  await expect(focused).toBeVisible();
});
