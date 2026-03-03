import { Plus, Trash2 } from 'lucide-react';
import { KeyValue, RequestBody } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import VariableInput from '../VariableInput';
import VariableTextarea from '../VariableTextarea';
import CodeEditor from '../CodeEditor';

const BODY_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'json', label: 'JSON' },
  { value: 'raw', label: 'Raw' },
  { value: 'x-www-form-urlencoded', label: 'URL Encoded' },
  { value: 'form-data', label: 'Form Data' },
] as const;

interface BodyEditorProps {
  body: RequestBody;
  onChange: (body: RequestBody) => void;
}

export default function BodyEditor({ body, onChange }: BodyEditorProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-fetchy-border">
        {BODY_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange({ ...body, type: type.value as RequestBody['type'] })}
            className={`px-3 py-1 text-sm rounded ${
              body.type === type.value
                ? 'bg-fetchy-accent text-white'
                : 'text-fetchy-text-muted hover:text-fetchy-text hover:bg-fetchy-border'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {body.type === 'none' && (
          <div className="h-full flex items-center justify-center text-fetchy-text-muted">
            <p>This request does not have a body</p>
          </div>
        )}

        {body.type === 'json' && (
          <CodeEditor
            value={body.raw || ''}
            onChange={(value: string) => onChange({ ...body, raw: value })}
            language="json"
          />
        )}

        {body.type === 'raw' && (
          <VariableTextarea
            value={body.raw || ''}
            onChange={(value: string) => onChange({ ...body, raw: value })}
            placeholder="Enter request body..."
          />
        )}

        {body.type === 'x-www-form-urlencoded' && (
          <KeyValueTable
            items={body.urlencoded || []}
            onChange={(updated) => onChange({ ...body, urlencoded: updated })}
          />
        )}

        {body.type === 'form-data' && (
          <KeyValueTable
            items={body.formData || []}
            onChange={(updated) => onChange({ ...body, formData: updated })}
          />
        )}
      </div>
    </div>
  );
}

/** Reusable key-value table for urlencoded and form-data body types */
function KeyValueTable({
  items,
  onChange,
}: {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
}) {
  return (
    <div className="p-2">
      <table className="w-full kv-table">
        <thead>
          <tr className="text-left text-xs text-fetchy-text-muted border-b border-fetchy-border">
            <th className="w-8 p-2"></th>
            <th className="p-2">Key</th>
            <th className="p-2">Value</th>
            <th className="w-8 p-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-fetchy-border/50">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => {
                    onChange(items.map(i => i.id === item.id ? { ...i, enabled: e.target.checked } : i));
                  }}
                  className="w-4 h-4 accent-fetchy-accent"
                />
              </td>
              <td className="p-0">
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => {
                    onChange(items.map(i => i.id === item.id ? { ...i, key: e.target.value } : i));
                  }}
                  placeholder="Key"
                  className="w-full bg-transparent p-2 text-sm outline-none focus:bg-fetchy-card"
                />
              </td>
              <td className="p-0">
                <VariableInput
                  value={item.value}
                  onChange={(value) => {
                    onChange(items.map(i => i.id === item.id ? { ...i, value } : i));
                  }}
                  placeholder="Value"
                  className="w-full bg-transparent p-2 text-sm outline-none focus:bg-fetchy-card"
                />
              </td>
              <td className="p-2">
                <button
                  onClick={() => onChange(items.filter(i => i.id !== item.id))}
                  className="p-1 hover:bg-fetchy-border rounded text-fetchy-text-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        onClick={() => {
          const newItem: KeyValue = { id: uuidv4(), key: '', value: '', enabled: true };
          onChange([...items, newItem]);
        }}
        className="flex items-center gap-1 px-3 py-2 text-sm text-fetchy-text-muted hover:text-fetchy-text"
      >
        <Plus size={14} /> Add Field
      </button>
    </div>
  );
}
