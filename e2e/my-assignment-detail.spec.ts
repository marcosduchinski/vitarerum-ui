import { expect, Page, test } from '@playwright/test';

async function loginAs(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('vita2026');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/p/dashboard');
}

const sidebar = (page: Page) => page.locator('.layout-sidebar');

test('collections staff can work through a my-assignment detail page', async ({ page }) => {
  await loginAs(page, 'bob@collections.example.com');

  await sidebar(page).getByRole('button', { name: 'Proposals' }).click();
  await sidebar(page).getByRole('link', { name: 'New' }).click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/new$/);

  await page.getByRole('button', { name: 'Assign VRP-20260601-0001 to me' }).click();
  await page.getByRole('button', { name: 'Assign to me', exact: true }).click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/my-assignments\/prop-1$/);

  await sidebar(page).getByRole('link', { name: 'My assignments' }).click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/my-assignments$/);
  await page
    .getByRole('link', { name: 'Zoology specimen catalogues from Atlantic forest surveys' })
    .click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/my-assignments\/prop-1$/);

  await expect(page.getByRole('link', { name: 'Back to my assignments' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  const overview = page.getByRole('region', { name: 'Overview' });
  await expect(overview.getByText('Alice Ferreira')).toBeVisible();
  await expect(overview.getByText('Bob Santos')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Event log' })).toBeVisible();
  await expect(page.getByText('ASSIGNED', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('tab', { name: 'Conversation' }).click();
  await expect(page.getByRole('heading', { name: 'Conversation' })).toBeVisible();
  await expect(page.getByText('Collection use request: VR-2026-001')).toBeVisible();
  const editor = page.getByRole('textbox', { name: 'Response message' });
  await editor.evaluate((element) => {
    element.innerHTML = '<p>E2E response from collections staff.</p>';
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });
  await page.getByRole('button', { name: 'Send response' }).click();
  await expect(page.getByText('E2E response from collections staff.')).toBeVisible();

  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await page.getByRole('button', { name: 'Accept proposal', exact: true }).click();
  await expect(page).toHaveURL(/\/p\/collections\/proposals\/approved$/);
  await expect(page.getByRole('heading', { name: 'Approved', exact: true })).toBeVisible();
});
