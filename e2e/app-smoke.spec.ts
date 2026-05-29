import { expect, test } from '@playwright/test';

test('signs in, shows dashboard, and handles unknown routes', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter workspace' })).toBeDisabled();

  await page.getByLabel('Email').fill('learner@example.com');
  await page.getByRole('button', { name: 'Enter workspace' }).click();

  await expect(page).toHaveURL(/\/p\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('24 open items')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();

  await page.goto('/missing-page');

  await expect(page).toHaveURL(/\/not-found$/);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
