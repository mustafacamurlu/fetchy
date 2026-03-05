/**
 * IPC handler for AI provider requests.
 * Handles: ai-request
 *
 * Supports: OpenAI, Claude/Anthropic, Google Gemini, Ollama, and custom
 * OpenAI-compatible providers.
 *
 * @module electron/ipc/aiHandler
 */
'use strict';

const https = require('https');
const http = require('http');
const { requireOneOf, requireArray, optionalString, requireObject } = require('./validate');

/**
 * Build the HTTP request options for each AI provider.
 * Returns { url, headers, body } ready to send.
 */
function buildAIRequest(provider, apiKey, model, baseUrl, messages, temperature, maxTokens) {
  switch (provider) {
    case 'openai': {
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2048,
        }),
      };
    }
    case 'claude': {
      // Anthropic uses a separate system field and x-api-key header
      const systemMsg = messages.find((m) => m.role === 'system');
      const nonSystemMsgs = messages.filter((m) => m.role !== 'system');
      const body = {
        model: model || 'claude-sonnet-4-20250514',
        messages: nonSystemMsgs,
        max_tokens: maxTokens ?? 2048,
        temperature: temperature ?? 0.7,
      };
      if (systemMsg) body.system = systemMsg.content;
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      };
    }
    case 'gemini': {
      // Google Gemini uses contents/parts structure
      const contents = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
      const systemInstruction = messages.find((m) => m.role === 'system');
      const geminiBody = {
        contents,
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens ?? 2048,
        },
      };
      if (systemInstruction) {
        geminiBody.systemInstruction = { parts: [{ text: systemInstruction.content }] };
      }
      const geminiModel = model || 'gemini-2.0-flash';
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(geminiBody),
      };
    }
    case 'ollama': {
      // Ollama exposes an OpenAI-compatible endpoint locally
      const ollamaBase = baseUrl || 'http://localhost:11434';
      return {
        url: `${ollamaBase}/v1/chat/completions`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2048,
        }),
      };
    }
    case 'custom': {
      // Custom provider uses OpenAI-compatible format
      if (!baseUrl) throw new Error('Custom provider requires a base URL');
      const customHeaders = { 'Content-Type': 'application/json' };
      if (apiKey) customHeaders['Authorization'] = `Bearer ${apiKey}`;
      return {
        url: baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/v1/chat/completions`,
        headers: customHeaders,
        body: JSON.stringify({
          model: model || 'default',
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 2048,
        }),
      };
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Parse the AI provider response into a unified format.
 */
function parseAIResponse(provider, responseBody) {
  try {
    const data = JSON.parse(responseBody);

    if (provider === 'claude') {
      // Anthropic response format
      const content = data.content?.[0]?.text || '';
      return {
        success: true,
        content,
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens || 0,
              completionTokens: data.usage.output_tokens || 0,
              totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
            }
          : undefined,
      };
    }
    if (provider === 'gemini') {
      // Gemini response format
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return {
        success: true,
        content,
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount || 0,
              completionTokens: data.usageMetadata.candidatesTokenCount || 0,
              totalTokens: data.usageMetadata.totalTokenCount || 0,
            }
          : undefined,
      };
    }
    // OpenAI-compatible format (openai, ollama, custom)
    const content = data.choices?.[0]?.message?.content || '';
    return {
      success: true,
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
    };
  } catch {
    return { success: false, content: '', error: 'Failed to parse AI response: ' + responseBody.slice(0, 500) };
  }
}

/**
 * Register the ai-request IPC handler.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {object} _deps - Reserved for future use
 */
function register(ipcMain, _deps) {
  ipcMain.handle('ai-request', async (event, data) => {
    return new Promise((resolve) => {
      try {
        // Validate inputs
        requireObject(data, 'ai request data');
        const provider = requireOneOf(data.provider, 'provider', ['openai', 'claude', 'gemini', 'ollama', 'custom']);
        const apiKey = optionalString(data.apiKey, 'apiKey', 10_000);
        const model = optionalString(data.model, 'model', 500);
        const baseUrl = optionalString(data.baseUrl, 'baseUrl', 2000);
        const messages = requireArray(data.messages, 'messages', 1000);
        const temperature = data.temperature != null ? Math.max(0, Math.min(2, Number(data.temperature) || 0.7)) : undefined;
        const maxTokens = data.maxTokens != null ? Math.max(1, Math.min(1_000_000, Math.round(Number(data.maxTokens) || 2048))) : undefined;

        const { url, headers, body } = buildAIRequest(provider, apiKey, model, baseUrl, messages, temperature, maxTokens);

        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const options = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'POST',
          headers,
          // AI requests always verify TLS — they carry API keys
          rejectUnauthorized: true,
        };

        const req = httpModule.request(options, (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parseAIResponse(provider, responseBody));
            } else {
              let errorMsg = `AI request failed (${res.statusCode})`;
              try {
                const errData = JSON.parse(responseBody);
                errorMsg = errData.error?.message || errData.error?.type || errData.message || errorMsg;
              } catch {}
              resolve({ success: false, content: '', error: errorMsg });
            }
          });
        });

        req.on('error', (error) => {
          let errorMsg = error.message;
          if (error.code === 'ENOTFOUND') errorMsg = 'DNS lookup failed – check your internet connection or API URL';
          else if (error.code === 'ECONNREFUSED') errorMsg = 'Connection refused – is the AI service running?';
          else if (error.code === 'ETIMEDOUT') errorMsg = 'Connection timed out';
          resolve({ success: false, content: '', error: errorMsg });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false, content: '', error: 'AI request timed out after 60 seconds' });
        });

        req.setTimeout(60000); // 60s timeout for AI requests
        if (body) req.write(body);
        req.end();
      } catch (error) {
        resolve({ success: false, content: '', error: error.message });
      }
    });
  });
}

module.exports = { register, buildAIRequest, parseAIResponse };
