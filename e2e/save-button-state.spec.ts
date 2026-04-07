import { test, expect } from '@playwright/test';
import { createCollectionAndOpenRequest, createWorkspace, getUrlInput, resetBrowserState } from './helpers/fetchyTestUtils';

test.describe('Fetchy – Save Button State', () => {
  test.beforeEach(async ({ page }) => {
    await resetBrowserState(page);
  });

  test('open request without changes keeps save disabled, editing request enables save', async ({ page }) => {
    await createWorkspace(page, 'Save Button Workspace');
    await createCollectionAndOpenRequest(page);

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeDisabled();

    const urlInput = getUrlInput(page);
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://jsonplaceholder.typicode.com/posts/1');

    await expect(saveButton).toBeEnabled();
  });
});