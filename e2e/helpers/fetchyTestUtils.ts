import { expect, type Page } from '@playwright/test';

type MockProxyResponse = {
  status: number;
  statusText: string;
  body: unknown;
  headers?: Record<string, string>;
  time?: number;
  bodyEncoding?: 'utf-8' | 'base64';
};

const defaultJsonHeaders = { 'content-type': 'application/json' };

export async function resetBrowserState(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function createWorkspace(page: Page, workspaceName: string) {
  await expect(page.getByText('Create your first workspace')).toBeVisible();
  await page.getByPlaceholder('e.g. My Project').fill(workspaceName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByText('Welcome to Fetchy')).toBeVisible({ timeout: 15_000 });
}

export async function createCollectionAndOpenRequest(page: Page) {
  await page.getByRole('button', { name: 'Create Collection' }).click();
  await expect(page.getByText('New Collection').first()).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: 'New Request' }).click();
  await page.getByText('New Request').last().click();

  await expect(getUrlInput(page)).toBeVisible();
}

export function getUrlInput(page: Page) {
  return page.getByPlaceholder('Enter request URL or paste a cURL command');
}

export async function mockProxyResponses(page: Page, mocks: Record<string, MockProxyResponse>) {
  await page.route('**/api/proxy', async route => {
    const payload = route.request().postDataJSON() as { method?: string; url: string };
    const method = (payload.method || 'GET').toUpperCase();
    const key = `${method} ${payload.url}`;
    const mock = mocks[key];

    if (!mock) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 0,
          statusText: 'Proxy Error',
          headers: {},
          body: JSON.stringify({ error: `No mock registered for ${key}` }),
          time: 1,
          size: 0,
        }),
      });
    }

    const responseBody = typeof mock.body === 'string' ? mock.body : JSON.stringify(mock.body);
    const headers = mock.headers ?? defaultJsonHeaders;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: mock.status,
        statusText: mock.statusText,
        headers,
        body: responseBody,
        time: mock.time ?? 15,
        size: new TextEncoder().encode(responseBody).length,
        bodyEncoding: mock.bodyEncoding ?? 'utf-8',
      }),
    });
  });
}