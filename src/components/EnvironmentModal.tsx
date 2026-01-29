import { useState } from 'react';
import { X, Plus, Trash2, Check, Edit2, Lock, Unlock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { KeyValue } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface EnvironmentModalProps {
  onClose: () => void;
}

export default function EnvironmentModal({ onClose }: EnvironmentModalProps) {
  const {
    environments,
    activeEnvironmentId,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useAppStore();

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(
    activeEnvironmentId || (environments.length > 0 ? environments[0].id : null)
  );
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const selectedEnv = environments.find(e => e.id === selectedEnvId);

  const handleAddEnvironment = () => {
    const env = addEnvironment('New Environment');
    setSelectedEnvId(env.id);
    setEditingName(env.id);
    setNewName(env.name);
  };

  const handleSaveName = (envId: string) => {
    if (newName.trim()) {
      updateEnvironment(envId, { name: newName.trim() });
    }
    setEditingName(null);
    setNewName('');
  };

  const handleAddVariable = () => {
    if (!selectedEnv) return;
    const newVar: KeyValue = { id: uuidv4(), key: '', value: '', enabled: true };
    updateEnvironment(selectedEnv.id, {
      variables: [...selectedEnv.variables, newVar],
    });
  };

  const handleUpdateVariable = (varId: string, updates: Partial<KeyValue>) => {
    if (!selectedEnv) return;
    updateEnvironment(selectedEnv.id, {
      variables: selectedEnv.variables.map(v =>
        v.id === varId ? { ...v, ...updates } : v
      ),
    });
  };

  const handleDeleteVariable = (varId: string) => {
    if (!selectedEnv) return;
    updateEnvironment(selectedEnv.id, {
      variables: selectedEnv.variables.filter(v => v.id !== varId),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-aki-card border border-aki-border rounded-lg shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aki-border shrink-0">
          <h2 className="text-xl font-semibold text-aki-text">Environments</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Environments list */}
          <div className="w-64 border-r border-aki-border flex flex-col bg-aki-sidebar">
            <div className="p-3 border-b border-aki-border">
              <button
                onClick={handleAddEnvironment}
                className="btn btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={16} /> Add Environment
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {environments.length === 0 ? (
                <p className="text-center text-aki-text-muted text-sm py-8">
                  No environments yet
                </p>
              ) : (
                environments.map((env) => (
                  <div
                    key={env.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer group mb-1 ${
                      selectedEnvId === env.id
                        ? 'bg-aki-accent/20 text-aki-accent'
                        : 'hover:bg-aki-border text-aki-text'
                    }`}
                    onClick={() => setSelectedEnvId(env.id)}
                  >
                    {activeEnvironmentId === env.id && (
                      <Check size={14} className="text-green-400 shrink-0" />
                    )}
                    {editingName === env.id ? (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleSaveName(env.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName(env.id);
                          if (e.key === 'Escape') setEditingName(null);
                        }}
                        className="flex-1 bg-transparent border-b border-aki-accent outline-none text-sm"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 text-sm truncate">{env.name}</span>
                    )}
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-aki-border rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingName(env.id);
                        setNewName(env.name);
                      }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEnvironment(env.id);
                        if (selectedEnvId === env.id) {
                          setSelectedEnvId(environments[0]?.id || null);
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Variables editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEnv ? (
              <>
                <div className="p-4 border-b border-aki-border flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="font-medium text-aki-text">{selectedEnv.name}</h3>
                    <p className="text-xs text-aki-text-muted">
                      {selectedEnv.variables.length} variable{selectedEnv.variables.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeEnvironmentId === selectedEnv.id ? (
                      <button
                        onClick={() => setActiveEnvironment(null)}
                        className="btn btn-secondary text-sm flex items-center gap-2"
                      >
                        <Check size={14} className="text-green-400" />
                        Active
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveEnvironment(selectedEnv.id)}
                        className="btn btn-primary text-sm"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <table className="w-full kv-table">
                    <thead>
                      <tr className="text-left text-xs text-aki-text-muted border-b border-aki-border">
                        <th className="w-8 p-2"></th>
                        <th className="p-2">Variable</th>
                        <th className="p-2">Value</th>
                        <th className="w-16 p-2 text-center">Secret</th>
                        <th className="w-8 p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEnv.variables.map((variable) => (
                        <tr key={variable.id} className="border-b border-aki-border/50">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={variable.enabled}
                              onChange={(e) =>
                                handleUpdateVariable(variable.id, { enabled: e.target.checked })
                              }
                              className="w-4 h-4 accent-aki-accent"
                            />
                          </td>
                          <td className="p-0">
                            <input
                              type="text"
                              value={variable.key}
                              onChange={(e) =>
                                handleUpdateVariable(variable.id, { key: e.target.value })
                              }
                              placeholder="Variable name"
                              className={`w-full bg-transparent p-2 text-sm outline-none focus:bg-aki-sidebar ${variable.isSecret ? 'text-orange-400' : ''}`}
                            />
                          </td>
                          <td className="p-0">
                            <input
                              type={variable.isSecret ? 'password' : 'text'}
                              value={variable.value}
                              onChange={(e) =>
                                handleUpdateVariable(variable.id, { value: e.target.value })
                              }
                              placeholder={variable.isSecret ? '••••••••' : 'Value'}
                              className={`w-full bg-transparent p-2 text-sm outline-none focus:bg-aki-sidebar ${variable.isSecret ? 'text-orange-400' : ''}`}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleUpdateVariable(variable.id, { isSecret: !variable.isSecret })}
                              className={`p-1.5 rounded transition-colors ${
                                variable.isSecret 
                                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                                  : 'hover:bg-aki-border text-aki-text-muted hover:text-aki-text'
                              }`}
                              title={variable.isSecret ? 'Secret (value hidden in history)' : 'Not secret (click to make secret)'}
                            >
                              {variable.isSecret ? <Lock size={14} /> : <Unlock size={14} />}
                            </button>
                          </td>
                          <td className="p-2">
                            <button
                              onClick={() => handleDeleteVariable(variable.id)}
                              className="p-1 hover:bg-aki-border rounded text-aki-text-muted hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={handleAddVariable}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-aki-text-muted hover:text-aki-text mt-2"
                  >
                    <Plus size={14} /> Add Variable
                  </button>

                  <div className="mt-6 p-4 bg-aki-sidebar rounded-lg">
                    <h4 className="text-sm font-medium text-aki-text mb-2">Usage</h4>
                    <p className="text-xs text-aki-text-muted mb-2">
                      Use variables in your requests with double angle brackets:
                    </p>
                    <code className="text-xs bg-aki-bg px-2 py-1 rounded text-aki-accent">
                      {'<<variableName>>'}
                    </code>
                    <p className="text-xs text-aki-text-muted mt-2">
                      Variables can be used in URLs, headers, body, and authentication fields.
                    </p>

                    <div className="mt-4 pt-4 border-t border-aki-border">
                      <h4 className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
                        <Lock size={14} /> Secret Variables
                      </h4>
                      <p className="text-xs text-aki-text-muted">
                        Mark variables as secret to keep their values hidden in request history.
                        Secret values will be replaced during execution but saved as{' '}
                        <code className="text-orange-400">{'<<variableName>>'}</code> in history.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-aki-text-muted">
                <div className="text-center">
                  <p className="mb-4">Select an environment or create a new one</p>
                  <button
                    onClick={handleAddEnvironment}
                    className="btn btn-primary text-sm"
                  >
                    Create Environment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-aki-border bg-aki-sidebar shrink-0">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

