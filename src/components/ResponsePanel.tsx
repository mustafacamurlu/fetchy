import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowDown, Copy, Check, Download, FileImage, Braces, Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { ApiResponse, ApiRequest } from '../types';
import { formatBytes, formatTime, getStatusColor, prettyPrintJson, getMethodBgColor } from '../utils/helpers';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import JSONViewer from './JSONViewer';
import { AIResponseToolbar } from './AIAssistant';

interface ResponsePanelProps {
  response: ApiResponse | null;
  sentRequest?: ApiRequest | null;
  isLoading: boolean;
}

export default function ResponsePanel({ response, sentRequest, isLoading }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<'response-body' | 'response-headers' | 'request-headers' | 'request-body' | 'console'>('response-body');
  const [copied, setCopied] = useState(false);
  const [manualPrettyPrint, setManualPrettyPrint] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const codeEditorResponseRef = useRef<CodeEditorHandle>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchActiveIdx(0);
  }, []);

  function escapeRegexPanel(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Reset pretty-print state on new response
  useEffect(() => {
    setManualPrettyPrint(false);
    closeSearch();
  }, [response, closeSearch]);

  const responseHeaders = response?.headers ?? {};

  // Detect if body is valid JSON but content-type is not application/json (JSONViewer handles that).
  // Skip the JSON.parse check for large bodies — the pretty-print button is non-critical
  // and parsing 2 MB+ synchronously on every response would block the main thread.
  const isJsonBody = useMemo(() => {
    if (!response || response.bodyEncoding === 'base64') return false;
    if (responseHeaders['content-type']?.includes('application/json')) return false;
    if (response.body.length > 100_000) return false;
    try {
      JSON.parse(response.body);
      return true;
    } catch {
      return false;
    }
  }, [response]);

  // Detect if body is already pretty-printed (body is already guarded to ≤100 KB via isJsonBody)
  const isAlreadyPretty = useMemo(() => {
    if (!response || !isJsonBody) return true;
    return response.body === prettyPrintJson(response.body);
  }, [response, isJsonBody]);

  const showPrettyPrintButton = isJsonBody && !isAlreadyPretty && !manualPrettyPrint;

  // Searchable text: the literal string shown in the response body area
  const searchableText = useMemo(() => {
    if (!response || response.bodyEncoding === 'base64') return '';
    if (responseHeaders['content-type']?.includes('application/json')) return response.body;
    return manualPrettyPrint ? prettyPrintJson(response.body) : response.body;
  }, [response, manualPrettyPrint, responseHeaders]);

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim() || !searchableText) return 0;
    try {
      return [...searchableText.matchAll(new RegExp(escapeRegexPanel(searchQuery), 'gi'))].length;
    } catch { return 0; }
  }, [searchQuery, searchableText]);

  // Clamp active index so stale values after query/response changes stay valid
  const effectiveSearchIdx = searchMatchCount > 0 ? searchActiveIdx % searchMatchCount : 0;

  const goToNextMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setSearchActiveIdx(i => (i + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const goToPrevMatch = useCallback(() => {
    if (searchMatchCount === 0) return;
    setSearchActiveIdx(i => (i - 1 + searchMatchCount) % searchMatchCount);
  }, [searchMatchCount]);

  // Binary response detection (#23)
  const isBinary = response?.bodyEncoding === 'base64';
  const contentType = responseHeaders['content-type']?.split(';')[0]?.trim().toLowerCase() ?? '';
  const isImage = isBinary && contentType.startsWith('image/');

  // Build data URI for image preview
  const imageDataUri = useMemo(() => {
    if (!isImage || !response) return '';
    return `data:${contentType};base64,${response.body}`;
  }, [isImage, response, contentType]);

  // Infer a file extension from the content-type
  const fileExtension = useMemo(() => {
    if (!contentType) return 'bin';
    const sub = contentType.split('/')[1] || 'bin';
    // Normalise common MIME subtypes
    const EXT_MAP: Record<string, string> = {
      'jpeg': 'jpg', 'svg+xml': 'svg', 'x-icon': 'ico',
      'plain': 'txt', 'javascript': 'js', 'x-tar': 'tar',
      'x-gzip': 'gz', 'x-bzip2': 'bz2', 'x-7z-compressed': '7z',
      'x-rar-compressed': 'rar', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    return EXT_MAP[sub] || sub;
  }, [contentType]);

  const handleCopyBody = () => {
    if (!response) return;
    if (isBinary) {
      // For binary, copy a placeholder message — raw bytes can't be usefully pasted
      navigator.clipboard.writeText(`[Binary response: ${formatBytes(response.size)}, ${contentType || 'unknown type'}]`);
    } else {
      const text = responseHeaders['content-type']?.includes('application/json')
        ? prettyPrintJson(response.body)
        : response.body;
      navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /** Download / save the full response body (text or binary) */
  const handleSaveFullResponse = async () => {
    if (!response) return;
    const defaultName = `response.${fileExtension}`;
    const api = (window as any).electronAPI;

    if (isBinary) {
      // Decode base64 → Uint8Array for a proper binary save
      const raw = atob(response.body);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      if (api?.saveFile) {
        // Electron: send the binary buffer for lossless saving
        await api.saveFile({
          content: Array.from(bytes),
          defaultName,
          filters: [
            { name: 'All Files', extensions: ['*'] },
          ],
          binary: true,
        });
      } else {
        const blob = new Blob([bytes], { type: contentType || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      if (api?.saveFile) {
        await api.saveFile({
          content: response.body,
          defaultName,
          filters: [
            { name: 'Text Files', extensions: ['txt', 'json', 'xml', 'html'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
      } else {
        const blob = new Blob([response.body], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-fetchy-bg">
        <div className="w-12 h-12 border-4 border-fetchy-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-fetchy-text-muted">Sending request...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-fetchy-bg text-fetchy-text-muted">
        <div className="text-6xl mb-4">📡</div>
        <p className="text-lg">No response yet</p>
        <p className="text-sm mt-2">Send a request to see the response</p>
      </div>
    );
  }

  // response is guaranteed non-null here (we returned early above if it was null).
  // JSONViewer handles application/json bodies directly, so no prettyPrintJson call needed.
  const formattedBody = response.body;

  const getRequestBodyContent = () => {
    if (!sentRequest) return '';
    if (sentRequest.body.type === 'none') return '(No body)';
    if (sentRequest.body.type === 'json' || sentRequest.body.type === 'raw') {
      return sentRequest.body.raw || '';
    }
    if (sentRequest.body.type === 'form-data' && sentRequest.body.formData) {
      return sentRequest.body.formData
        .filter(f => f.enabled)
        .map(f => `${f.key}: ${f.value}`)
        .join('\n');
    }
    if (sentRequest.body.type === 'x-www-form-urlencoded' && sentRequest.body.urlencoded) {
      return sentRequest.body.urlencoded
        .filter(f => f.enabled)
        .map(f => `${f.key}=${f.value}`)
        .join('&');
    }
    return '';
  };

  return (
    <div className="h-full flex flex-col bg-fetchy-bg">
      {/* Status bar */}
      <div className="px-4 py-3 border-b border-fetchy-border">
        {/* Request info */}
        {sentRequest && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-fetchy-border/50">
            <Send size={14} className="text-fetchy-accent" />
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-[52px] text-center ${getMethodBgColor(sentRequest.method)}`}>
              {sentRequest.method}
            </span>
            <span className="text-sm text-fetchy-text truncate flex-1">{sentRequest.url}</span>
          </div>
        )}
        {/* Response info */}
        <div className="flex items-center gap-4">
          <ArrowDown size={14} className="text-green-400" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-fetchy-text-muted">Status:</span>
            <span className={`font-bold ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-fetchy-text-muted">Time:</span>
            <span className="text-sm text-fetchy-text">{formatTime(response.time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-fetchy-text-muted">Size:</span>
            <span className="text-sm text-fetchy-text">{formatBytes(response.size)}</span>
          </div>
        </div>
      </div>

      {/* AI Response Toolbar */}
      {sentRequest && (
        <div className="px-3 py-1.5 border-b border-fetchy-border shrink-0">
          <AIResponseToolbar request={sentRequest} response={response} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-fetchy-border shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('response-body')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'response-body'
              ? 'border-fetchy-accent text-fetchy-accent'
              : 'border-transparent text-fetchy-text-muted hover:text-fetchy-text'
          }`}
        >
          Response Body
        </button>
        <button
          onClick={() => setActiveTab('response-headers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'response-headers'
              ? 'border-fetchy-accent text-fetchy-accent'
              : 'border-transparent text-fetchy-text-muted hover:text-fetchy-text'
          }`}
        >
          Response Headers
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-fetchy-accent/20 text-fetchy-accent rounded">
            {Object.keys(responseHeaders).length}
          </span>
        </button>
        {sentRequest && (
          <>
            <button
              onClick={() => setActiveTab('request-headers')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'request-headers'
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-fetchy-text-muted hover:text-fetchy-text'
              }`}
            >
              Request Headers
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-400/20 text-purple-400 rounded">
                {sentRequest.headers.filter(h => h.enabled).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('request-body')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'request-body'
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-fetchy-text-muted hover:text-fetchy-text'
              }`}
            >
              Request Body
            </button>
          </>
        )}
        <button
          onClick={() => setActiveTab('console')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'console'
              ? 'border-fetchy-accent text-fetchy-accent'
              : 'border-transparent text-fetchy-text-muted hover:text-fetchy-text'
          }`}
        >
          Console
          {(response.scriptError || response.preScriptError) && (
            <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-red-500"></span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'response-body' && (
          <div
            className="relative h-full flex flex-col"
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                e.stopPropagation();
                openSearch();
              }
            }}
          >
            <div className="absolute top-2 right-4 z-20 flex items-center gap-1">
              {!isBinary && (
                <button
                  onClick={() => { searchOpen ? closeSearch() : openSearch(); }}
                  className={`p-1.5 rounded bg-fetchy-card/80 hover:bg-fetchy-border transition-colors ${
                    searchOpen ? 'text-fetchy-accent' : 'text-fetchy-text-muted hover:text-fetchy-text'
                  }`}
                  title="Search (Ctrl+F)"
                >
                  <Search size={14} />
                </button>
              )}
              {showPrettyPrintButton && (
                <button
                  onClick={() => setManualPrettyPrint(true)}
                  className="p-1.5 rounded bg-fetchy-card/80 hover:bg-fetchy-border text-fetchy-text-muted hover:text-fetchy-text transition-colors"
                  title="Pretty print JSON"
                >
                  <Braces size={14} />
                </button>
              )}
              <button
                onClick={handleCopyBody}
                className="p-1.5 rounded bg-fetchy-card/80 hover:bg-fetchy-border text-fetchy-text-muted hover:text-fetchy-text transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Inline search bar */}
            {searchOpen && (
              <div className="flex items-center gap-2 pl-3 pr-[7rem] py-1.5 border-b border-fetchy-border bg-fetchy-card shrink-0">
                <Search size={13} className="text-fetchy-text-muted shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSearchActiveIdx(0); }}
                  onKeyDown={e => {
                    if (e.key === 'Escape') closeSearch();
                    else if (e.key === 'Enter') { e.shiftKey ? goToPrevMatch() : goToNextMatch(); }
                  }}
                  placeholder="Search in response…"
                  className="flex-1 min-w-0 bg-transparent text-sm text-fetchy-text outline-none placeholder:text-fetchy-text-muted/60"
                  autoFocus
                />
                {searchQuery && (
                  <span className="text-xs text-fetchy-text-muted shrink-0 tabular-nums">
                    {searchMatchCount > 0 ? `${effectiveSearchIdx + 1} / ${searchMatchCount}` : 'No matches'}
                  </span>
                )}
                <button
                  onClick={goToPrevMatch}
                  disabled={searchMatchCount === 0}
                  className="p-0.5 rounded text-fetchy-text-muted hover:text-fetchy-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous match (Shift+Enter)"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={goToNextMatch}
                  disabled={searchMatchCount === 0}
                  className="p-0.5 rounded text-fetchy-text-muted hover:text-fetchy-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next match (Enter)"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  onClick={closeSearch}
                  className="p-0.5 rounded text-fetchy-text-muted hover:text-fetchy-text transition-colors"
                  title="Close (Esc)"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {response.bodyTruncated && (
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-400 text-xs shrink-0">
                <span>
                  Response truncated for display (original size: {formatBytes(response.fullBodySize ?? 0)}).
                </span>
                <button
                  onClick={handleSaveFullResponse}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 transition-colors"
                >
                  <Download size={12} />
                  Save Full Response
                </button>
              </div>
            )}
            <div className="flex-1 overflow-hidden">
            {isBinary ? (
              /* Binary response display (#23) */
              isImage ? (
                <div className="h-full flex flex-col items-center justify-center p-4 overflow-auto">
                  <img
                    src={imageDataUri}
                    alt="Response image"
                    className="max-w-full max-h-[70vh] object-contain rounded border border-fetchy-border"
                  />
                  <div className="mt-3 flex items-center gap-3 text-sm text-fetchy-text-muted">
                    <span>{contentType}</span>
                    <span>{formatBytes(response.size)}</span>
                    <button
                      onClick={handleSaveFullResponse}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-fetchy-accent/20 hover:bg-fetchy-accent/30 text-fetchy-accent transition-colors"
                    >
                      <Download size={12} />
                      Save Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-fetchy-text-muted">
                  <FileImage size={48} className="mb-4 opacity-50" />
                  <p className="text-lg mb-1">Binary Response</p>
                  <p className="text-sm mb-4">{contentType || 'Unknown type'} — {formatBytes(response.size)}</p>
                  <button
                    onClick={handleSaveFullResponse}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-fetchy-accent/20 hover:bg-fetchy-accent/30 text-fetchy-accent transition-colors"
                  >
                    <Download size={14} />
                    Save to File
                  </button>
                </div>
              )
            ) : responseHeaders['content-type']?.includes('application/json') ? (
              <JSONViewer
                data={response.body}
                searchQuery={searchOpen ? searchQuery : undefined}
                searchActiveIndex={searchOpen ? effectiveSearchIdx : undefined}
              />
            ) : (
              <CodeEditor
                ref={codeEditorResponseRef}
                value={manualPrettyPrint ? prettyPrintJson(response.body) : formattedBody}
                onChange={() => {}}
                language="json"
                readOnly
                searchQuery={searchOpen ? searchQuery : undefined}
                searchActiveIndex={searchOpen ? effectiveSearchIdx : undefined}
                onKeyDownIntercept={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    openSearch();
                    return true;
                  }
                  return false;
                }}
              />
            )}
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full overflow-auto p-4 font-mono text-sm">
            {response.preScriptOutput && (
              <div className="mb-3">
                <span className="text-fetchy-text-muted text-xs">--- Pre-Script ---</span>
                <pre className="text-green-400 whitespace-pre-wrap mt-1">{response.preScriptOutput}</pre>
              </div>
            )}
            {response.preScriptError && (
              <div className="mb-3">
                <span className="text-fetchy-text-muted text-xs">--- Pre-Script Error ---</span>
                <pre className="text-red-500 whitespace-pre-wrap mt-1">{response.preScriptError}</pre>
              </div>
            )}
            {response.scriptOutput && (
              <div className="mb-3">
                <span className="text-fetchy-text-muted text-xs">--- Post-Script ---</span>
                <pre className="text-green-400 whitespace-pre-wrap mt-1">{response.scriptOutput}</pre>
              </div>
            )}
            {response.scriptError && (
              <div className="mb-3">
                <span className="text-fetchy-text-muted text-xs">--- Post-Script Error ---</span>
                <pre className="text-red-500 whitespace-pre-wrap mt-1">{response.scriptError}</pre>
              </div>
            )}
            {!response.scriptOutput && !response.scriptError && !response.preScriptOutput && !response.preScriptError && (
              <p className="text-fetchy-text-muted">No script output</p>
            )}
          </div>
        )}

        {activeTab === 'response-headers' && (
          <div className="h-full overflow-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-fetchy-text-muted border-b border-fetchy-border">
                  <th className="p-2">Header</th>
                  <th className="p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(responseHeaders).map(([key, value]) => (
                  <tr key={key} className="border-b border-fetchy-border/50">
                    <td className="p-2 text-sm font-medium text-fetchy-accent">{key}</td>
                    <td className="p-2 text-sm text-fetchy-text break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'request-headers' && sentRequest && (
          <div className="h-full overflow-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-fetchy-text-muted border-b border-fetchy-border">
                  <th className="p-2">Header</th>
                  <th className="p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {sentRequest.headers.filter(h => h.enabled).map((header) => (
                  <tr key={header.id} className="border-b border-fetchy-border/50">
                    <td className="p-2 text-sm font-medium text-purple-400">{header.key}</td>
                    <td className="p-2 text-sm text-fetchy-text break-all">{header.value}</td>
                  </tr>
                ))}
                {sentRequest.headers.filter(h => h.enabled).length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-fetchy-text-muted text-sm">
                      No request headers
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'request-body' && sentRequest && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 text-xs text-fetchy-text-muted border-b border-fetchy-border">
              Body Type: <span className="text-fetchy-text">{sentRequest.body.type}</span>
            </div>
            {sentRequest.body.type === 'none' ? (
              <div className="flex-1 flex items-center justify-center text-fetchy-text-muted">
                No request body
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  value={getRequestBodyContent()}
                  onChange={() => {}}
                  language={sentRequest.body.type === 'json' ? 'json' : 'text'}
                  readOnly
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

