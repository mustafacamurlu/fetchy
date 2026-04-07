import { test, expect, type Page } from '@playwright/test';
import { createWorkspace, getUrlInput, mockProxyResponses, resetBrowserState } from './helpers/fetchyTestUtils';

const postmanCrudCollection = JSON.stringify({
  info: {
    name: 'Comprehensive CRUD Collection',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description: 'CRUD requests used by Playwright E2E tests.',
  },
  item: [
    {
      name: 'Get Post',
      request: {
        method: 'GET',
        header: [
          { key: 'Accept', value: 'application/json' },
        ],
        url: {
          raw: 'https://jsonplaceholder.typicode.com/posts/1',
        },
      },
    },
    {
      name: 'Create Post',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Accept', value: 'application/json' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ title: 'playwright title', body: 'playwright body', userId: 99 }, null, 2),
          options: {
            raw: { language: 'json' },
          },
        },
        url: {
          raw: 'https://jsonplaceholder.typicode.com/posts',
        },
      },
    },
    {
      name: 'Update Post',
      request: {
        method: 'PUT',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Accept', value: 'application/json' },
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ id: 1, title: 'updated title', body: 'updated body', userId: 1 }, null, 2),
          options: {
            raw: { language: 'json' },
          },
        },
        url: {
          raw: 'https://jsonplaceholder.typicode.com/posts/1',
        },
      },
    },
    {
      name: 'Delete Post',
      request: {
        method: 'DELETE',
        header: [
          { key: 'Accept', value: 'application/json' },
        ],
        url: {
          raw: 'https://jsonplaceholder.typicode.com/posts/1',
        },
      },
    },
  ],
}, null, 2);

async function importPostmanCollection(page: Page) {
  await page.getByRole('button', { name: 'Import Collection' }).click();

  const modal = page.locator('.bg-fetchy-modal');

  await expect(modal.getByRole('heading', { name: 'Import', exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Collection', exact: true }).click();
  await modal.getByRole('button', { name: 'Postman v2.1 JSON', exact: true }).click();
  await modal.getByPlaceholder('Paste your Postman collection JSON here...').fill(postmanCrudCollection);
  await modal.getByRole('button', { name: 'Import', exact: true }).click();

  await expect(page.getByText('Successfully imported collection "Comprehensive CRUD Collection"')).toBeVisible({ timeout: 5_000 });
  await expect(modal.getByRole('heading', { name: 'Import', exact: true })).toBeHidden({ timeout: 5_000 });
  await expect(page.getByText('Comprehensive CRUD Collection')).toBeVisible({ timeout: 5_000 });
}

async function runRequest(page: Page, requestName: string, expectedUrl: string, expectedStatus: string, expectedBodyText?: string) {
  await page.getByText(requestName, { exact: true }).click();

  const urlInput = getUrlInput(page);
  await expect(urlInput).toBeVisible();
  await expect(urlInput).toHaveValue(expectedUrl);

  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText(expectedStatus, { exact: true })).toBeVisible({ timeout: 30_000 });

  if (expectedBodyText) {
    await expect(page.getByText(expectedBodyText)).toBeVisible({ timeout: 10_000 });
  }
}

test.describe('Fetchy – Postman Import CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await mockProxyResponses(page, {
      'GET https://jsonplaceholder.typicode.com/posts/1': {
        status: 200,
        statusText: 'OK',
        body: { userId: 1, id: 1, title: 'mock post' },
      },
      'POST https://jsonplaceholder.typicode.com/posts': {
        status: 201,
        statusText: 'Created',
        body: { id: 101, title: 'playwright title', body: 'playwright body', userId: 99 },
      },
      'PUT https://jsonplaceholder.typicode.com/posts/1': {
        status: 200,
        statusText: 'OK',
        body: { id: 1, title: 'updated title', body: 'updated body', userId: 1 },
      },
      'DELETE https://jsonplaceholder.typicode.com/posts/1': {
        status: 200,
        statusText: 'OK',
        body: {},
      },
    });
    await resetBrowserState(page);
  });

  test('create workspace → import postman collection → run CRUD requests successfully', async ({ page }) => {
    await createWorkspace(page, 'Postman CRUD Workspace');
    await importPostmanCollection(page);

    await runRequest(page, 'Get Post', 'https://jsonplaceholder.typicode.com/posts/1', '200 OK', 'mock post');
    await runRequest(page, 'Create Post', 'https://jsonplaceholder.typicode.com/posts', '201 Created', 'playwright title');
    await runRequest(page, 'Update Post', 'https://jsonplaceholder.typicode.com/posts/1', '200 OK', 'updated title');
    await runRequest(page, 'Delete Post', 'https://jsonplaceholder.typicode.com/posts/1', '200 OK');
  });
});