import { test, expect } from '@playwright/test';
import { createCollectionAndOpenRequest, createWorkspace, getUrlInput, resetBrowserState } from './helpers/fetchyTestUtils';

test.describe('Fetchy – Unsaved Close Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
  });

  test('close modified request tab without saving shows confirmation popup', async ({ page }) => {
    await createWorkspace(page, 'Unsaved Close Workspace');
    await createCollectionAndOpenRequest(page);

    const urlInput = getUrlInput(page);
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });

    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeDisabled();

    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/2');
    await expect(saveButton).toBeEnabled();

    const activeTab = page.locator('.tab-item').filter({ has: page.getByText('New Request', { exact: true }) }).first();
    await activeTab.getByRole('button').click();

    await expect(page.getByText('Are you sure you want to close without saving?')).toBeVisible({ timeout: 5_000 });
  });
});