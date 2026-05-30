import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('alice@ext.example.com');
  await page.getByRole('button', { name: 'Enter workspace' }).click();
  await page.waitForURL('**/p/dashboard');
}

test('EXTERNAL role shows proposals/projects sections, hides staff items', async ({ page }) => {
  await login(page);
  await page.screenshot({ path: '/tmp/nav-external.png', fullPage: true });

  const sidebar = page.locator('aside.sidebar');
  await expect(sidebar.getByRole('link', { name: 'New proposal' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'My proposals' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'My projects' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Staff queue' })).not.toBeVisible();
  await expect(sidebar.getByText('Administration')).not.toBeVisible();
});

test('switching to COLLECTIONS_MANAGEMENT shows staff nav and admin section', async ({ page }) => {
  await login(page);
  await page.selectOption('#role-switcher', 'COLLECTIONS_MANAGEMENT');
  await page.screenshot({ path: '/tmp/nav-staff.png', fullPage: true });

  const sidebar = page.locator('aside.sidebar');
  await expect(sidebar.getByRole('link', { name: 'Staff queue' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Pending documents' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'All projects' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Users' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'New proposal' })).not.toBeVisible();
});

test('switching to DIRECTION shows direction-only nav', async ({ page }) => {
  await login(page);
  await page.selectOption('#role-switcher', 'DIRECTION');
  await page.screenshot({ path: '/tmp/nav-direction.png', fullPage: true });

  const sidebar = page.locator('aside.sidebar');
  await expect(sidebar.getByRole('link', { name: 'Pending direction' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Approved' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Pending documents' })).not.toBeVisible();
  await expect(sidebar.getByText('Administration')).not.toBeVisible();
});

test('Dashboard link carries aria-current=page', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
});

test('mobile 375px: sidebar links visible, section labels hidden', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await page.screenshot({ path: '/tmp/nav-mobile.png', fullPage: true });

  const sidebar = page.locator('aside.sidebar');
  await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'My proposals' })).toBeVisible();
  // Section label text is hidden (display:none) on mobile
  const labels = sidebar.locator('.sidebar__section-label');
  for (const label of await labels.all()) {
    await expect(label).toBeHidden();
  }
});

test('keyboard: Tab from page body reaches sidebar nav links', async ({ page }) => {
  await login(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /Vitarerum/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeFocused();
});
