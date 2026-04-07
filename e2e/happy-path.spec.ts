import { test, expect } from '@playwright/test';
import { createCollectionAndOpenRequest, createWorkspace, getUrlInput, mockProxyResponses, resetBrowserState } from './helpers/fetchyTestUtils';

/**
 * E2E smoke test: full happy-path flow in browser mode.
 *
 * 1. Create a workspace (browser mode – no directory pickers needed)
 * 2. Use "Quick Start" to create a sample collection with a GET request
 * 3. Verify the request tab opens with the correct URL
 * 4. Send the request and verify a successful response (200 OK)
 */
test.describe('Fetchy – Happy Path', () => {
  test.beforeEach(async ({ page }) => {
    await mockProxyResponses(page, {
      'GET https://jsonplaceholder.typicode.com/posts/1': {
        status: 200,
        statusText: 'OK',
        body: { userId: 1, id: 1, title: 'mock post' },
      },
      'GET https://jsonplaceholder.typicode.com/users/1': {
        status: 200,
        statusText: 'OK',
        body: { id: 1, username: 'Bret', email: 'bret@example.com' },
      },
    });
    await resetBrowserState(page);
  });

  test('create workspace → quick start collection → send request → 200 OK', async ({ page }) => {
    // ── Step 1: Create a workspace ─────────────────────────────────────────
    // In browser mode we only need a workspace name – no folder pickers.
    await createWorkspace(page, 'Test Workspace');

    // ── Step 2: Quick Start – creates "My Collection" + sample GET request ─
    const quickStartBtn = page.getByRole('button', { name: 'Quick Start' });
    await quickStartBtn.click();

    // Verify a collection appeared in the sidebar
    await expect(page.getByText('My Collection')).toBeVisible({ timeout: 5_000 });

    // Verify the request tab opened with the sample URL
    const urlInput = getUrlInput(page);
    await expect(urlInput).toBeVisible();
    await expect(urlInput).toHaveValue('https://jsonplaceholder.typicode.com/posts/1');

    // ── Step 3: Send the request ───────────────────────────────────────────
    const sendBtn = page.getByRole('button', { name: 'Send' });
    await sendBtn.click();

    // ── Step 4: Verify successful response ─────────────────────────────────
    await expect(page.getByText('200 OK', { exact: true })).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText('mock post')).toBeVisible({ timeout: 5_000 });
  });

  test('create workspace → new collection → add request manually → send → 200 OK', async ({ page }) => {
    await createWorkspace(page, 'Manual Test Workspace');
    await createCollectionAndOpenRequest(page);

    // ── Step 4: Fill in the request URL ────────────────────────────────────
    const urlInput = getUrlInput(page);
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://jsonplaceholder.typicode.com/users/1');

    // ── Step 5: Send the request ───────────────────────────────────────────
    const sendBtn = page.getByRole('button', { name: 'Send' });
    await sendBtn.click();

    // ── Step 6: Verify successful response ─────────────────────────────────
    await expect(page.getByText('200 OK', { exact: true })).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText('"bret@example.com"', { exact: true })).toBeVisible({ timeout: 5_000 });
  });
});
