import { useState } from 'react';
import { Copy, Check, Send, ArrowDown } from 'lucide-react';
import { ApiResponse, ApiRequest } from '../types';
import { formatBytes, formatTime, getStatusColor, prettyPrintJson, getMethodBgColor } from '../utils/helpers';
import CodeEditor from './CodeEditor';

interface ResponsePanelProps {
  response: ApiResponse | null;
  sentRequest?: ApiRequest | null;
  isLoading: boolean;
}

export default function ResponsePanel({ response, sentRequest, isLoading }: ResponsePanelProps) {
  const [activeTab, setActiveTab] = useState<'response-body' | 'response-headers' | 'request-headers' | 'request-body'>('response-body');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-aki-bg">
        <div className="w-12 h-12 border-4 border-aki-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-aki-text-muted">Sending request...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-aki-bg text-aki-text-muted">
        <div className="text-6xl mb-4">📡</div>
        <p className="text-lg">No response yet</p>
        <p className="text-sm mt-2">Send a request to see the response</p>
      </div>
    );
  }

  const formattedBody = response.headers['content-type']?.includes('application/json')
    ? prettyPrintJson(response.body)
    : response.body;

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
    <div className="h-full flex flex-col bg-aki-bg">
      {/* Status bar */}
      <div className="px-4 py-3 border-b border-aki-border">
        {/* Request info */}
        {sentRequest && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-aki-border/50">
            <Send size={14} className="text-aki-accent" />
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getMethodBgColor(sentRequest.method)}`}>
              {sentRequest.method}
            </span>
            <span className="text-sm text-aki-text truncate flex-1">{sentRequest.url}</span>
          </div>
        )}
        {/* Response info */}
        <div className="flex items-center gap-4">
          <ArrowDown size={14} className="text-green-400" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-aki-text-muted">Status:</span>
            <span className={`font-bold ${getStatusColor(response.status)}`}>
              {response.status} {response.statusText}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-aki-text-muted">Time:</span>
            <span className="text-sm text-aki-text">{formatTime(response.time)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-aki-text-muted">Size:</span>
            <span className="text-sm text-aki-text">{formatBytes(response.size)}</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={copyToClipboard}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-aki-border shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('response-body')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'response-body'
              ? 'border-aki-accent text-aki-accent'
              : 'border-transparent text-aki-text-muted hover:text-aki-text'
          }`}
        >
          Response Body
        </button>
        <button
          onClick={() => setActiveTab('response-headers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'response-headers'
              ? 'border-aki-accent text-aki-accent'
              : 'border-transparent text-aki-text-muted hover:text-aki-text'
          }`}
        >
          Response Headers
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-aki-accent/20 text-aki-accent rounded">
            {Object.keys(response.headers).length}
          </span>
        </button>
        {sentRequest && (
          <>
            <button
              onClick={() => setActiveTab('request-headers')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'request-headers'
                  ? 'border-purple-400 text-purple-400'
                  : 'border-transparent text-aki-text-muted hover:text-aki-text'
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
                  : 'border-transparent text-aki-text-muted hover:text-aki-text'
              }`}
            >
              Request Body
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'response-body' && (
          <CodeEditor
            value={formattedBody}
            onChange={() => {}}
            language="json"
            readOnly
          />
        )}

        {activeTab === 'response-headers' && (
          <div className="h-full overflow-auto p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-aki-text-muted border-b border-aki-border">
                  <th className="p-2">Header</th>
                  <th className="p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(response.headers).map(([key, value]) => (
                  <tr key={key} className="border-b border-aki-border/50">
                    <td className="p-2 text-sm font-medium text-aki-accent">{key}</td>
                    <td className="p-2 text-sm text-aki-text break-all">{value}</td>
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
                <tr className="text-left text-xs text-aki-text-muted border-b border-aki-border">
                  <th className="p-2">Header</th>
                  <th className="p-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {sentRequest.headers.filter(h => h.enabled).map((header) => (
                  <tr key={header.id} className="border-b border-aki-border/50">
                    <td className="p-2 text-sm font-medium text-purple-400">{header.key}</td>
                    <td className="p-2 text-sm text-aki-text break-all">{header.value}</td>
                  </tr>
                ))}
                {sentRequest.headers.filter(h => h.enabled).length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-aki-text-muted text-sm">
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
            <div className="px-4 py-2 text-xs text-aki-text-muted border-b border-aki-border">
              Body Type: <span className="text-aki-text">{sentRequest.body.type}</span>
            </div>
            {sentRequest.body.type === 'none' ? (
              <div className="flex-1 flex items-center justify-center text-aki-text-muted">
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

