import { useState, useCallback, useEffect } from 'react';
import { HelpCircle, Settings } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import WelcomeScreen from './components/WelcomeScreen';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import EnvironmentModal from './components/EnvironmentModal';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import SettingsModal from './components/SettingsModal';
import { useAppStore } from './store/appStore';
import { usePreferencesStore } from './store/preferencesStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ApiResponse, RequestHistoryItem, ApiRequest } from './types';

function App() {
  const { tabs, activeTabId, sidebarWidth, sidebarCollapsed, collections, addCollection, addRequest, openTab, getActiveEnvironment } = useAppStore();
  const { loadPreferences } = usePreferencesStore();
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [sentRequest, setSentRequest] = useState<ApiRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const hasActiveRequest = activeTab?.type === 'request';

  const activeEnvironment = getActiveEnvironment();

  const handleHistoryItemClick = useCallback((item: RequestHistoryItem) => {
    // Just set the response and sent request from history to display them
    // Don't add to collection - user can manually save if they want
    if (item.response) {
      setResponse(item.response);
    }
    setSentRequest(item.request);
  }, []);

  const handleNewRequest = useCallback(() => {
    if (collections.length === 0) {
      const collection = addCollection('My Collection');
      const request = addRequest(collection.id, null);
      openTab({
        type: 'request',
        title: request.name,
        requestId: request.id,
        collectionId: collection.id,
      });
    } else {
      const request = addRequest(collections[0].id, null);
      openTab({
        type: 'request',
        title: request.name,
        requestId: request.id,
        collectionId: collections[0].id,
      });
    }
  }, [collections, addCollection, addRequest, openTab]);

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      handler: handleNewRequest,
      description: 'New request',
    },
    {
      key: 'i',
      ctrl: true,
      handler: () => setShowImportModal(true),
      description: 'Import',
    },
    {
      key: 'e',
      ctrl: true,
      handler: () => setShowEnvironmentModal(true),
      description: 'Environments',
    },
    {
      key: '/',
      ctrl: true,
      handler: () => setShowShortcutsModal(true),
      description: 'Keyboard shortcuts',
    },
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-aki-bg overflow-hidden">
      {/* Top bar */}
      <div className="h-12 bg-aki-sidebar border-b border-aki-border flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="./logo.jpg" alt="Fetchy" className="h-8 w-8 rounded" />
          <div className="text-xl font-bold text-aki-accent">Fetchy</div>
          <span className="text-xs text-aki-text-muted italic">Local by design. Reliable by nature</span>
          <span className="text-xs text-aki-text-muted">v1.0.0</span>
        </div>
        <div className="flex items-center gap-2">
          {activeEnvironment && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full" />
              {activeEnvironment.name}
            </div>
          )}
          <button
            onClick={handleNewRequest}
            className="btn btn-secondary text-sm"
            title="New Request (Ctrl+N)"
          >
            New Request
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary text-sm"
            title="Import (Ctrl+I)"
          >
            Import
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="btn btn-secondary text-sm"
            title="Export"
            disabled={collections.length === 0}
          >
            Export
          </button>
          <button
            onClick={() => setShowEnvironmentModal(true)}
            className="btn btn-secondary text-sm"
            title="Environments (Ctrl+E)"
          >
            Environments
          </button>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
            title="Keyboard Shortcuts (Ctrl+/)"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          className="shrink-0 transition-all duration-200 overflow-hidden"
        >
          <Sidebar
            onImport={() => setShowImportModal(true)}
            onHistoryItemClick={handleHistoryItemClick}
          />
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <TabBar />

          {/* Request/Response area */}
          {hasActiveRequest ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Request panel */}
              <div className="w-1/2 border-r border-aki-border overflow-hidden">
                <RequestPanel
                  setResponse={setResponse}
                  setSentRequest={setSentRequest}
                  setIsLoading={setIsLoading}
                  isLoading={isLoading}
                />
              </div>

              {/* Response panel */}
              <div className="w-1/2 overflow-hidden">
                <ResponsePanel
                  response={response}
                  sentRequest={sentRequest}
                  isLoading={isLoading}
                />
              </div>
            </div>
          ) : (
            <WelcomeScreen onImport={() => setShowImportModal(true)} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} />
      )}

      {showExportModal && (
        <ExportModal onClose={() => setShowExportModal(false)} />
      )}

      {showEnvironmentModal && (
        <EnvironmentModal onClose={() => setShowEnvironmentModal(false)} />
      )}

      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}

export default App;

