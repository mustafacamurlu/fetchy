import { Link } from 'lucide-react';
import { RequestAuth } from '../../types';
import VariableInput from '../VariableInput';

const AUTH_TYPES = [
  { value: 'inherit', label: 'Inherit' },
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
] as const;

interface AuthEditorProps {
  auth: RequestAuth;
  /** Resolved auth from parent collection/folder chain, null if none configured */
  inheritedAuth: RequestAuth | null;
  onChange: (auth: RequestAuth) => void;
}

export default function AuthEditor({ auth, inheritedAuth, onChange }: AuthEditorProps) {
  const getAuthTypeLabel = (type: string) => {
    const found = AUTH_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-fetchy-border">
        {AUTH_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange({ ...auth, type: type.value as RequestAuth['type'] })}
            className={`px-3 py-1 text-sm rounded ${
              auth.type === type.value
                ? 'bg-fetchy-accent text-white'
                : 'text-fetchy-text-muted hover:text-fetchy-text hover:bg-fetchy-border'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {auth.type === 'inherit' && (
          <div className="space-y-4">
            {inheritedAuth ? (
              <div className="p-4 bg-fetchy-card rounded-lg border border-fetchy-border">
                <div className="flex items-center gap-2 text-fetchy-text mb-2">
                  <Link size={16} className="text-fetchy-accent" />
                  <span className="font-medium">Inheriting auth from parent</span>
                </div>
                <div className="text-sm text-fetchy-text-muted space-y-1">
                  <p><span className="font-medium">Type:</span> {getAuthTypeLabel(inheritedAuth.type)}</p>
                  {inheritedAuth.type === 'basic' && (
                    <p><span className="font-medium">Username:</span> {inheritedAuth.basic?.username || '(not set)'}</p>
                  )}
                  {inheritedAuth.type === 'bearer' && (
                    <p><span className="font-medium">Token:</span> {inheritedAuth.bearer?.token ? '••••••••' : '(not set)'}</p>
                  )}
                  {inheritedAuth.type === 'api-key' && (
                    <>
                      <p><span className="font-medium">Key:</span> {inheritedAuth.apiKey?.key || '(not set)'}</p>
                      <p><span className="font-medium">Add to:</span> {inheritedAuth.apiKey?.addTo === 'header' ? 'Header' : 'Query Params'}</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-fetchy-text-muted text-center py-8">
                <p>No auth configured in parent collection or folder</p>
                <p className="text-xs mt-2">Configure auth at the collection or folder level to inherit it here</p>
              </div>
            )}
          </div>
        )}

        {auth.type === 'none' && (
          <div className="text-fetchy-text-muted text-center py-8">
            <p>This request does not require authentication</p>
          </div>
        )}

        {auth.type === 'basic' && (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Username</label>
              <VariableInput
                value={auth.basic?.username || ''}
                onChange={(value) => onChange({
                  ...auth, basic: { ...auth.basic, username: value, password: auth.basic?.password || '' }
                })}
                className="w-full"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Password</label>
              <VariableInput
                value={auth.basic?.password || ''}
                onChange={(value) => onChange({
                  ...auth, basic: { ...auth.basic, username: auth.basic?.username || '', password: value }
                })}
                className="w-full"
                placeholder="Enter password"
              />
            </div>
          </div>
        )}

        {auth.type === 'bearer' && (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Token</label>
              <VariableInput
                value={auth.bearer?.token || ''}
                onChange={(value) => onChange({
                  ...auth, bearer: { token: value }
                })}
                className="w-full"
                placeholder="Enter bearer token"
              />
            </div>
          </div>
        )}

        {auth.type === 'api-key' && (
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Key</label>
              <VariableInput
                value={auth.apiKey?.key || ''}
                onChange={(value) => onChange({
                  ...auth, apiKey: { ...auth.apiKey, key: value, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' }
                })}
                className="w-full"
                placeholder="e.g., X-API-Key"
              />
            </div>
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Value</label>
              <VariableInput
                value={auth.apiKey?.value || ''}
                onChange={(value) => onChange({
                  ...auth, apiKey: { ...auth.apiKey, key: auth.apiKey?.key || '', value, addTo: auth.apiKey?.addTo || 'header' }
                })}
                className="w-full"
                placeholder="Enter API key value"
              />
            </div>
            <div>
              <label className="block text-sm text-fetchy-text-muted mb-1">Add to</label>
              <select
                value={auth.apiKey?.addTo || 'header'}
                onChange={(e) => onChange({
                  ...auth, apiKey: { ...auth.apiKey, key: auth.apiKey?.key || '', value: auth.apiKey?.value || '', addTo: e.target.value as 'header' | 'query' }
                })}
                className="w-full"
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
