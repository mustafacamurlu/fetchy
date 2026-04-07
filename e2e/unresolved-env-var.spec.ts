import { test, expect } from '@playwright/test';
import { createCollectionAndOpenRequest, createWorkspace, getUrlInput, mockProxyResponses, resetBrowserState } from './helpers/fetchyTestUtils';

test.describe('Fetchy – Unresolved Environment Variable', () => {
  test.beforeEach(async ({ page }) => {
    await mockProxyResponses(page, {
      'GET https://<<missingHost>>/posts/1': {
        status: 0,
        statusText: 'Proxy Error',
        headers: {},
        body: { error: 'Invalid URL' },
      },
    });
    await resetBrowserState(page);
  });

  test('create workspace → add request with undefined env var in url → request fails', async ({ page }) => {
    await createWorkspace(page, 'Missing Env Var Workspace');
    await createCollectionAndOpenRequest(page);

    const urlInput = getUrlInput(page);
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://<<missingHost>>/posts/1');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('0 Proxy Error', { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Invalid URL')).toBeVisible({ timeout: 10_000 });
  });
});