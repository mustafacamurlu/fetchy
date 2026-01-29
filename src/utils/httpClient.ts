import { ApiRequest, ApiResponse, KeyValue, RequestAuth } from '../types';
import { replaceVariables } from './helpers';

// ElectronAPI type is declared in ../types/index.ts

interface ExecuteRequestOptions {
  request: ApiRequest;
  collectionVariables?: KeyValue[];
  environmentVariables?: KeyValue[];
  inheritedAuth?: RequestAuth | null;
}

export const executeRequest = async ({
  request,
  collectionVariables = [],
  environmentVariables = [],
  inheritedAuth = null,
}: ExecuteRequestOptions): Promise<ApiResponse> => {
  const startTime = performance.now();

  // Combine variables
  const allVariables = [...collectionVariables, ...environmentVariables];

  // Determine effective auth (use inherited if type is 'inherit')
  const effectiveAuth = request.auth.type === 'inherit' && inheritedAuth
    ? inheritedAuth
    : request.auth;

  // Process URL with variables
  let url = replaceVariables(request.url, allVariables, []);

  // Add query parameters
  const enabledParams = request.params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    enabledParams.forEach(p => {
      const value = replaceVariables(p.value, allVariables, []);
      urlObj.searchParams.append(p.key, value);
    });
    url = urlObj.toString();
  }

  // Add API key to query if configured
  if (effectiveAuth.type === 'api-key' && effectiveAuth.apiKey?.addTo === 'query') {
    const urlObj = new URL(url.startsWith('http') ? url : `http://${url}`);
    const key = replaceVariables(effectiveAuth.apiKey.key, allVariables, []);
    const value = replaceVariables(effectiveAuth.apiKey.value, allVariables, []);
    urlObj.searchParams.append(key, value);
    url = urlObj.toString();
  }

  // Build headers
  const headers: Record<string, string> = {};

  // Add request headers
  for (const header of request.headers) {
    if (header.enabled && header.key) {
      headers[header.key] = replaceVariables(header.value, allVariables, []);
    }
  }

  // Add auth headers
  if (effectiveAuth.type === 'bearer' && effectiveAuth.bearer) {
    const token = replaceVariables(effectiveAuth.bearer.token, allVariables, []);
    headers['Authorization'] = `Bearer ${token}`;
  } else if (effectiveAuth.type === 'basic' && effectiveAuth.basic) {
    const username = replaceVariables(effectiveAuth.basic.username, allVariables, []);
    const password = replaceVariables(effectiveAuth.basic.password, allVariables, []);
    const credentials = btoa(`${username}:${password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (effectiveAuth.type === 'api-key' && effectiveAuth.apiKey?.addTo === 'header') {
    const key = replaceVariables(effectiveAuth.apiKey.key, allVariables, []);
    const value = replaceVariables(effectiveAuth.apiKey.value, allVariables, []);
    headers[key] = value;
  }

  // Build body
  let body: string | FormData | undefined;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    switch (request.body.type) {
      case 'json':
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        body = replaceVariables(request.body.raw || '', allVariables, []);
        break;
      case 'raw':
        body = replaceVariables(request.body.raw || '', allVariables, []);
        break;
      case 'x-www-form-urlencoded': {
        headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
        const params = new URLSearchParams();
        for (const item of request.body.urlencoded || []) {
          if (item.enabled && item.key) {
            params.append(item.key, replaceVariables(item.value, allVariables, []));
          }
        }
        body = params.toString();
        break;
      }
      case 'form-data': {
        const formData = new FormData();
        for (const item of request.body.formData || []) {
          if (item.enabled && item.key) {
            formData.append(item.key, replaceVariables(item.value, allVariables, []));
          }
        }
        body = formData;
        // Don't set Content-Type for FormData, let the browser set it with boundary
        delete headers['Content-Type'];
        break;
      }
    }
  }

  try {
    // Use Electron's main process for HTTP requests (bypasses CORS)
    if (window.electronAPI?.httpRequest && !(body instanceof FormData)) {
      const response = await window.electronAPI.httpRequest({
        url,
        method: request.method,
        headers,
        body: body as string | undefined,
      });

      return response;
    }

    // Fallback to fetch for web or when FormData is used
    const response = await fetch(url, {
      method: request.method,
      headers,
      body,
    });

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Get response body
    const responseText = await response.text();

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      time: responseTime,
      size: new Blob([responseText]).size,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: JSON.stringify({ error: errorMessage }),
      time: responseTime,
      size: 0,
    };
  }
};

