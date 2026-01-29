import { useState, useEffect } from 'react';
import { X, FolderOpen, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { usePreferencesStore } from '../store/preferencesStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { preferences, isElectron, savePreferences, selectHomeDirectory, setHomeDirectory, getHomeDirectory } = usePreferencesStore();

  const [currentHomeDir, setCurrentHomeDir] = useState<string>('');
  const [newHomeDir, setNewHomeDir] = useState<string>('');
  const [migrateData, setMigrateData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCurrentHomeDir();
    }
  }, [isOpen]);

  const loadCurrentHomeDir = async () => {
    const dir = await getHomeDirectory();
    setCurrentHomeDir(dir);
    setNewHomeDir(dir);
  };

  const handleSelectDirectory = async () => {
    const selected = await selectHomeDirectory();
    if (selected) {
      setNewHomeDir(selected);
    }
  };

  const handleSaveHomeDirectory = async () => {
    if (!newHomeDir || newHomeDir === currentHomeDir) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const success = await setHomeDirectory(newHomeDir, migrateData);

      if (success) {
        setSaveStatus('success');
        setCurrentHomeDir(newHomeDir);

        // Reload the page to reinitialize stores with new home directory
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSaveStatus('error');
        setErrorMessage('Failed to set home directory. Please check permissions.');
      }
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden border border-[#2d2d44]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d44]">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white hover:bg-[#2d2d44] rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Home Directory Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">
              Data Storage Location
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Current Home Directory
                </label>
                <div className="flex items-center gap-2 p-3 bg-[#0f0f1a] rounded border border-[#2d2d44]">
                  <FolderOpen size={16} className="text-gray-500" />
                  <span className="text-gray-300 text-sm font-mono truncate flex-1">
                    {currentHomeDir || 'Not set (using default)'}
                  </span>
                </div>
              </div>

              {isElectron && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      New Home Directory
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newHomeDir}
                        onChange={(e) => setNewHomeDir(e.target.value)}
                        className="flex-1 px-3 py-2 bg-[#0f0f1a] border border-[#2d2d44] rounded text-white text-sm font-mono focus:outline-none focus:border-purple-500"
                        placeholder="Enter path or browse..."
                      />
                      <button
                        onClick={handleSelectDirectory}
                        className="px-3 py-2 bg-[#2d2d44] text-gray-300 rounded hover:bg-[#3d3d54] transition-colors"
                        title="Browse..."
                      >
                        <FolderOpen size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="migrateData"
                      checked={migrateData}
                      onChange={(e) => setMigrateData(e.target.checked)}
                      className="w-4 h-4 rounded border-[#2d2d44] bg-[#0f0f1a] text-purple-500 focus:ring-purple-500"
                    />
                    <label htmlFor="migrateData" className="text-sm text-gray-300">
                      Migrate existing data to new location
                    </label>
                  </div>

                  <button
                    onClick={handleSaveHomeDirectory}
                    disabled={isSaving || !newHomeDir || newHomeDir === currentHomeDir}
                    className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                      isSaving || !newHomeDir || newHomeDir === currentHomeDir
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Apply Home Directory
                      </>
                    )}
                  </button>

                  {saveStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <Check size={16} />
                      Home directory updated. Reloading...
                    </div>
                  )}

                  {saveStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle size={16} />
                      {errorMessage || 'Failed to update home directory'}
                    </div>
                  )}
                </>
              )}

              {!isElectron && (
                <div className="text-sm text-gray-500 italic">
                  Home directory selection is only available in the desktop app.
                  Data is stored in browser localStorage.
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500">
              All collections, environments, and request history will be stored in this directory.
              Changing the home directory will require restarting the application.
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2d2d44]" />

          {/* Other Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white uppercase tracking-wider">
              General Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300">Auto-save</label>
                  <p className="text-xs text-gray-500">Automatically save changes to collections</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoSave}
                  onChange={(e) => savePreferences({ autoSave: e.target.checked })}
                  className="w-4 h-4 rounded border-[#2d2d44] bg-[#0f0f1a] text-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-gray-300">Max History Items</label>
                  <p className="text-xs text-gray-500">Number of request history items to keep</p>
                </div>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={preferences.maxHistoryItems}
                  onChange={(e) => savePreferences({ maxHistoryItems: parseInt(e.target.value) || 100 })}
                  className="w-20 px-2 py-1 bg-[#0f0f1a] border border-[#2d2d44] rounded text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-[#2d2d44]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

