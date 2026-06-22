import { expect, Page, test } from '@playwright/test';

const PROJECT_ID = 'proj-7';

const PROJECT = {
  id: PROJECT_ID,
  referenceNumber: 'VR-2026-007',
  title: 'Photographic history of Rio de Janeiro port, 1890–1930',
  purpose: 'Research on photographic records documenting Rio de Janeiro port history.',
  type: 'IN_SITU_VISIT',
  status: 'COMPLETED',
  result: 'COMPLETED',
  beginDate: '2026-06-01',
  endDate: '2026-06-05',
  requestedBy: {
    permissionId: 'perm-hugo',
    user: { id: 'u-hugo', name: 'Hugo Prado', email: 'hugo@example.test' },
    group: 'EXTERNAL',
  },
  proposal: {
    id: 'prop-7',
    status: 'APPROVED',
    assignedTo: {
      permissionId: 'perm-dan',
      user: { id: 'u-dan', name: 'Dan Oliveira', email: 'dan@example.test' },
      group: 'DIRECTION',
    },
  },
  actions: {
    canStart: false,
    canComplete: false,
    canCancel: false,
    canOpenLog: true,
    canCreateObjectLogEntry: false,
    canCreateOccurrenceEntry: false,
    canConcludeObjectAccessLog: false,
    canConcludeObjectOccurrenceLog: false,
  },
  staffContext: null,
} as const;

type ReportGroup = 'CURATORIAL' | 'COLLECTIONS_MANAGEMENT' | 'DIRECTION';

async function authenticateAs(page: Page, group: ReportGroup, permissionId: string): Promise<void> {
  await page.addInitScript(
    ({ activeGroup, activePermissionId }) => {
      localStorage.setItem(
        'vitarerum.session',
        JSON.stringify({
          accessToken: 'e2e-access-token',
          user: {
            id: `user-${activeGroup.toLowerCase()}`,
            email: `${activeGroup.toLowerCase()}@example.test`,
            displayName: activeGroup,
          },
          group: activeGroup,
          availableGroups: [activeGroup],
          permissions: [{ permissionId: activePermissionId, group: activeGroup }],
        }),
      );
    },
    { activeGroup: group, activePermissionId: permissionId },
  );
}

async function stubProject(page: Page): Promise<void> {
  await page.route(`**/collection-use-projects/${PROJECT_ID}`, async (route) => {
    await route.fulfill({ json: PROJECT });
  });
  await page.route(`**/collection-use-projects/${PROJECT_ID}/events**`, async (route) => {
    await route.fulfill({
      json: {
        projectId: PROJECT_ID,
        content: [],
        page: 0,
        size: 20,
        totalElements: 0,
        totalPages: 0,
      },
    });
  });
}

test.describe('in-situ visit report creation', () => {
  test('curatorial staff creates a report with selected narrative options', async ({ page }) => {
    await authenticateAs(page, 'CURATORIAL', 'perm-curatorial');
    await stubProject(page);

    let requestBody: unknown;
    let permissionHeader: string | undefined;
    await page.route(`**/reports/${PROJECT_ID}/in_situ_visit`, async (route) => {
      requestBody = route.request().postDataJSON();
      permissionHeader = route.request().headers()['x-permission-id'];
      await route.fulfill({
        status: 201,
        headers: { Location: `/api/v1/reports/${PROJECT_ID}/in_situ_visit/report-1` },
        json: {
          id: 'report-1',
          createdAt: '2026-06-22T10:30:00Z',
          createdBy: 'perm-curatorial',
          projectId: PROJECT_ID,
          narrativeId: 'narrative-1',
          inSituVisitRecordId: 'record-1',
          targetLanguage: 'en',
          narrativeType: 'scientific',
          creativityTemperature: 0.6,
        },
      });
    });

    await page.goto(`/p/collections/projects/curatorial/${PROJECT_ID}`);
    await page.getByRole('tab', { name: 'Actions', exact: true }).click();
    const actionsPanel = page.getByRole('tabpanel', { name: 'Actions' });
    await expect(actionsPanel.getByText('Reports', { exact: true })).toBeVisible();
    await actionsPanel.getByRole('button', { name: 'Create new In Situ Visit Report' }).click();

    const dialog = page.getByRole('dialog', { name: 'Create in-situ visit report' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Target language')).toHaveValue('pt');
    await expect(dialog.getByLabel('Narrative type')).toHaveValue('institutional');
    await expect(dialog.getByLabel('Creativity')).toHaveValue('0.3');

    await dialog.getByLabel('Target language').selectOption('en');
    await dialog.getByLabel('Narrative type').selectOption('scientific');
    await dialog.getByLabel('Creativity').fill('0.6');
    await dialog.getByRole('button', { name: 'Create report', exact: true }).click();

    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'In-situ visit report created', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Creating again will produce a separate report\./)).toBeVisible();
    expect(requestBody).toEqual({
      target_language: 'en',
      narrative_type: 'scientific',
      creativity_temperature: 0.6,
    });
    expect(permissionHeader).toBe('perm-curatorial');
  });

  test('collections staff can open report creation for an in-situ visit', async ({ page }) => {
    await authenticateAs(page, 'COLLECTIONS_MANAGEMENT', 'perm-collections');
    await stubProject(page);
    await page.goto(`/p/collections/projects/collections/${PROJECT_ID}`);

    await page.getByRole('tab', { name: 'Actions', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Create new In Situ Visit Report' }),
    ).toBeVisible();
  });

  test('direction staff does not see report creation', async ({ page }) => {
    await authenticateAs(page, 'DIRECTION', 'perm-direction');
    await stubProject(page);
    await page.goto(`/p/collections/projects/direction/${PROJECT_ID}`);

    await page.getByRole('tab', { name: 'Actions', exact: true }).click();
    const actionsPanel = page.getByRole('tabpanel', { name: 'Actions' });
    await expect(actionsPanel.getByText('Reports', { exact: true })).toHaveCount(0);
    await expect(
      actionsPanel.getByRole('button', { name: 'Create new In Situ Visit Report' }),
    ).toHaveCount(0);
  });
});
