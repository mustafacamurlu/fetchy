/**
 * IPC handler for proxied HTTP requests.
 * Handles: http-request
 *
 * @module electron/ipc/httpHandler
 */
'use strict';

const https = require('https');
const http = require('http');
const { requireUrl, requireHttpMethod, optionalString, requireObject } = require('./validate');

// Cap transferred response bodies at 10 MB to avoid IPC serialisation issues.
// The renderer further truncates to 5 MB for in-memory display (#8).
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

// Track in-flight requests by ID so they can be aborted (#15).
const activeRequests = new Map();

// ---------------------------------------------------------------------------
// Binary content-type detection (#23)
// ---------------------------------------------------------------------------
// MIME types (or prefixes / substrings) that represent non-text / binary data.
// Responses matching these are base64-encoded before being sent over IPC.
// ---------------------------------------------------------------------------
const BINARY_MIME_PREFIXES = [
  'image/',
  'audio/',
  'video/',
  'font/',
];

const BINARY_MIME_TYPES = new Set([
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/x-tar',
  'application/x-bzip2',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/wasm',
  'application/protobuf',
  'application/x-protobuf',
  'application/grpc',
  'application/vnd.google.protobuf',
  'application/msgpack',
  'application/x-msgpack',
  'application/avro',
  'application/x-sqlite3',
]);

/**
 * Return true if the Content-Type indicates a binary (non-text) response.
 */
function isBinaryContentType(contentType) {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(';')[0].trim();
  if (BINARY_MIME_TYPES.has(lower)) return true;
  for (const prefix of BINARY_MIME_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Parse the charset from a Content-Type header value.
 * Returns a Node.js Buffer-compatible encoding, or 'utf-8' as default.
 */
function parseCharset(contentType) {
  if (!contentType) return 'utf-8';
  const match = contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i);
  if (!match) return 'utf-8';
  const charset = match[1].toLowerCase();
  // Map common charset names to Node.js Buffer encodings
  const CHARSET_MAP = {
    'utf-8': 'utf-8',
    'utf8': 'utf-8',
    'ascii': 'ascii',
    'us-ascii': 'ascii',
    'latin1': 'latin1',
    'iso-8859-1': 'latin1',
    'iso8859-1': 'latin1',
    'windows-1252': 'latin1', // close enough for most Western European text
    'utf-16le': 'utf16le',
    'utf16le': 'utf16le',
    'ucs-2': 'ucs2',
    'ucs2': 'ucs2',
    'binary': 'latin1',
  };
  return CHARSET_MAP[charset] || 'utf-8';
}

/**
 * Build a multipart/form-data body from serialised entries (#24).
 *
 * @param {Array<{key: string, value: string}>} entries
 * @returns {{ body: Buffer, boundary: string }}
 */
function buildMultipartBody(entries) {
  const boundary = '----FetchyBoundary' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const parts = [];
  for (const { key, value } of entries) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key.replace(/"/g, '\\"')}"\r\n` +
      `\r\n` +
      `${value}\r\n`
    );
  }
  parts.push(`--${boundary}--\r\n`);
  return { body: Buffer.from(parts.join(''), 'utf-8'), boundary };
}

/**
 * Register the http-request IPC handler.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {object} deps - Shared dependencies (e.g. loadPreferences)
 */
function register(ipcMain, deps) {

  /**
   * Resolve the proxy URL to use for a request (#25).
   * Priority: manual setting > system env vars > none.
   * @returns {URL|null}
   */
  function resolveProxy() {
    try {
      const prefs = deps.loadPreferences ? deps.loadPreferences() : {};
      const proxy = prefs.proxy || { mode: 'system', url: '' };
      if (proxy.mode === 'none') return null;
      if (proxy.mode === 'manual' && proxy.url) {
        const proxyUrl = new URL(proxy.url);
        if (proxy.username) proxyUrl.username = proxy.username;
        if (proxy.password) proxyUrl.password = proxy.password;
        return proxyUrl;
      }
      // 'system' mode: respect environment variables
      const envProxy = process.env.HTTPS_PROXY || process.env.https_proxy
        || process.env.HTTP_PROXY || process.env.http_proxy;
      if (envProxy) {
        try { return new URL(envProxy); } catch { /* invalid env var */ }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Open a CONNECT tunnel through an HTTP proxy for HTTPS targets (#25).
   * Returns a connected socket that can be used as the agent socket.
   */
  function connectTunnel(proxyUrl, targetHost, targetPort) {
    return new Promise((resolve, reject) => {
      const proxyHeaders = {};
      if (proxyUrl.username || proxyUrl.password) {
        proxyHeaders['Proxy-Authorization'] = 'Basic ' +
          Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString('base64');
      }
      const connectReq = http.request({
        hostname: proxyUrl.hostname,
        port: proxyUrl.port || 80,
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        headers: proxyHeaders,
      });
      connectReq.on('connect', (_res, socket) => resolve(socket));
      connectReq.on('error', reject);
      connectReq.on('timeout', () => { connectReq.destroy(); reject(new Error('Proxy CONNECT tunnel timed out')); });
      connectReq.setTimeout(15000);
      connectReq.end();
    });
  }

  ipcMain.handle('http-request', async (event, data) => {
    // Validate inputs
    requireObject(data, 'request data');
    const { sslVerification, body, formData } = data;
    const url = requireUrl(data.url, 'url');
    const method = requireHttpMethod(data.method, 'method');
    const headers = data.headers && typeof data.headers === 'object' ? data.headers : {};
    const requestId = data.requestId ? optionalString(data.requestId, 'requestId', 200) : undefined;

    return new Promise((resolve) => {
      const startTime = Date.now();
      (async () => {
        try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method,
          headers: headers || {},
          // Default to true; only disable when explicitly set to false per-request
          rejectUnauthorized: sslVerification !== false,
        };

        // Proxy support (#25)
        const proxyUrl = resolveProxy();
        if (proxyUrl) {
          if (isHttps) {
            // HTTPS through proxy: use CONNECT tunnel
            try {
              const socket = await connectTunnel(proxyUrl, parsedUrl.hostname, parsedUrl.port || 443);
              options.socket = socket;
              // The socket is already connected to the target via the tunnel;
              // createConnection must not be called, so we use the socket directly.
              options.agent = false;
            } catch (tunnelErr) {
              resolve({
                status: 0,
                statusText: 'Proxy Error',
                headers: {},
                body: JSON.stringify({ error: `Proxy CONNECT failed: ${tunnelErr.message}` }),
                time: Date.now() - startTime,
                size: 0,
              });
              return;
            }
          } else {
            // HTTP through proxy: send request to proxy, use full URL as path
            options.hostname = proxyUrl.hostname;
            options.port = proxyUrl.port || 80;
            options.path = url; // Full URL as the request path for the proxy
            if (proxyUrl.username || proxyUrl.password) {
              options.headers['Proxy-Authorization'] = 'Basic ' +
                Buffer.from(`${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`).toString('base64');
            }
          }
        }

        const req = httpModule.request(options, (res) => {
          const chunks = [];
          let totalBytes = 0;
          let truncated = false;
          res.on('data', (chunk) => {
            totalBytes += chunk.length;
            if (!truncated) {
              chunks.push(chunk);
              if (totalBytes > MAX_RESPONSE_BYTES) truncated = true;
            }
          });
          res.on('end', () => {
            if (requestId) activeRequests.delete(requestId);
            const endTime = Date.now();
            const rawBuffer = Buffer.concat(chunks);

            // Determine encoding based on Content-Type (#23)
            const contentType = res.headers['content-type'] || '';
            const binary = isBinaryContentType(contentType);
            let responseBody;
            let bodyEncoding;

            if (binary) {
              // Binary responses are base64-encoded to survive IPC serialisation
              responseBody = rawBuffer.toString('base64');
              bodyEncoding = 'base64';
            } else {
              // Text responses: respect the charset declared in Content-Type
              const charset = parseCharset(contentType);
              responseBody = rawBuffer.toString(charset);
              bodyEncoding = 'utf-8';
            }

            const responseHeaders = {};
            for (const [key, value] of Object.entries(res.headers)) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
            }
            resolve({
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: responseHeaders,
              body: responseBody,
              bodyEncoding,
              time: endTime - startTime,
              size: totalBytes,
              bodyTruncated: truncated || undefined,
              fullBodySize: truncated ? totalBytes : undefined,
            });
          });
        });

        // Track so it can be aborted via abort-http-request (#15)
        if (requestId) activeRequests.set(requestId, req);

        req.on('error', (error) => {
          if (requestId) activeRequests.delete(requestId);
          const endTime = Date.now();

          // If the request was intentionally aborted, return a recognisable status
          if (error.message === 'socket hang up' && req.destroyed) {
            resolve({
              status: 0,
              statusText: 'Aborted',
              headers: {},
              body: JSON.stringify({ error: 'Request aborted by user' }),
              time: endTime - startTime,
              size: 0,
            });
            return;
          }

          let statusText = 'Network Error';
          if (error.code === 'ENOTFOUND') statusText = 'DNS Lookup Failed';
          else if (error.code === 'ECONNREFUSED') statusText = 'Connection Refused';
          else if (error.code === 'ECONNRESET') statusText = 'Connection Reset';
          else if (error.code === 'ETIMEDOUT') statusText = 'Connection Timed Out';
          else if (error.code === 'CERT_HAS_EXPIRED') statusText = 'Certificate Expired';
          else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') statusText = 'SSL Certificate Error';

          resolve({
            status: 0,
            statusText,
            headers: {},
            body: JSON.stringify({ error: error.message, code: error.code }),
            time: endTime - startTime,
            size: 0,
          });
        });

        req.on('timeout', () => {
          if (requestId) activeRequests.delete(requestId);
          req.destroy();
          resolve({
            status: 0,
            statusText: 'Timeout',
            headers: {},
            body: JSON.stringify({ error: 'Request timed out' }),
            time: Date.now() - startTime,
            size: 0,
          });
        });

        req.setTimeout(30000);

        // Write request body: multipart form-data (#24) or plain string
        if (Array.isArray(formData) && formData.length > 0) {
          const { body: mpBody, boundary } = buildMultipartBody(formData);
          // Override Content-Type with the correct boundary
          req.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
          req.setHeader('Content-Length', mpBody.length);
          req.write(mpBody);
        } else if (body) {
          req.write(body);
        }
        req.end();
      } catch (error) {
        if (requestId) activeRequests.delete(requestId);
        resolve({
          status: 0,
          statusText: 'Error',
          headers: {},
          body: JSON.stringify({ error: error.message }),
          time: Date.now() - startTime,
          size: 0,
        });
      }
      })();
    });
  });

  // Abort a tracked in-flight request (#15)
  ipcMain.handle('abort-http-request', async (event, requestId) => {
    if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 200) {
      return false;
    }
    const req = activeRequests.get(requestId);
    if (req) {
      req.destroy();
      activeRequests.delete(requestId);
      return true;
    }
    return false;
  });
}

module.exports = { register };
