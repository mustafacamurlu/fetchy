import { useState, useCallback, useEffect, useRef } from 'react';
import { HelpCircle, Settings, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import RequestPanel from './components/RequestPanel';
import ResponsePanel from './components/ResponsePanel';
import WelcomeScreen from './components/WelcomeScreen';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import EnvironmentModal from './components/EnvironmentModal';
import EnvironmentDropdown from './components/EnvironmentDropdown';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import SettingsModal from './components/SettingsModal';
import UpdateModal from './components/UpdateModal';
import ThemeToggle from './components/ThemeToggle';
import ResizeHandle from './components/ResizeHandle';
import { useAppStore } from './store/appStore';
import { usePreferencesStore } from './store/preferencesStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ApiResponse, RequestHistoryItem, ApiRequest } from './types';

type ImportType = 'postman' | 'openapi' | 'curl';

function App() {
  const {
    tabs,
    activeTabId,
    sidebarWidth,
    sidebarCollapsed,
    collections,
    addCollection,
    addRequest,
    openTab,
    setSidebarWidth,
    requestPanelWidth,
    setRequestPanelWidth,
  } = useAppStore();
  const { loadPreferences } = usePreferencesStore();
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [sentRequest, setSentRequest] = useState<ApiRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<ImportType>('postman');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEnvironmentModal, setShowEnvironmentModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const mainPanelRef = useRef<HTMLDivElement>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const hasActiveRequest = activeTab?.type === 'request';

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

  const handleImport = useCallback((type?: ImportType) => {
    if (type) {
      setImportType(type);
    }
    setShowImportModal(true);
  }, []);

  // Resize handlers
  const handleSidebarResize = useCallback((delta: number) => {
    const newWidth = Math.max(200, Math.min(600, sidebarWidth + delta));
    setSidebarWidth(newWidth);
  }, [sidebarWidth, setSidebarWidth]);

  const handleRequestPanelResize = useCallback((delta: number) => {
    if (!mainPanelRef.current) return;
    const containerWidth = mainPanelRef.current.offsetWidth;
    const pixelWidth = (requestPanelWidth / 100) * containerWidth;
    const newPixelWidth = Math.max(200, Math.min(containerWidth - 200, pixelWidth + delta));
    const newPercentage = (newPixelWidth / containerWidth) * 100;
    setRequestPanelWidth(newPercentage);
  }, [requestPanelWidth, setRequestPanelWidth]);

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
      handler: () => handleImport(),
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
          <span className="text-xs text-aki-text-muted">v1.1.0</span>
        </div>
        <div className="flex items-center gap-2">
          <EnvironmentDropdown onOpenSettings={() => setShowEnvironmentModal(true)} />
          <ThemeToggle />
          <button
            onClick={() => setShowUpdateModal(true)}
            className="p-2 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
            title="Check for Updates"
          >
            <RefreshCw size={18} />
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
            onImport={() => handleImport()}
            onHistoryItemClick={handleHistoryItemClick}
          />
        </div>

        {/* Sidebar resize handle */}
        {!sidebarCollapsed && (
          <ResizeHandle
            direction="horizontal"
            onResize={handleSidebarResize}
          />
        )}

        {/* Main panel */}
        <div className="flex-1 flex flex-col overflow-hidden" ref={mainPanelRef}>
          {/* Tab bar */}
          <TabBar />

          {/* Request/Response area */}
          {hasActiveRequest ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Request panel */}
              <div
                style={{ width: `${requestPanelWidth}%` }}
                className="shrink-0 overflow-hidden"
              >
                <RequestPanel
                  setResponse={setResponse}
                  setSentRequest={setSentRequest}
                  setIsLoading={setIsLoading}
                  isLoading={isLoading}
                />
              </div>

              {/* Request/Response resize handle */}
              <ResizeHandle
                direction="horizontal"
                onResize={handleRequestPanelResize}
              />

              {/* Response panel */}
              <div className="flex-1 overflow-hidden">
                <ResponsePanel
                  response={response}
                  sentRequest={sentRequest}
                  isLoading={isLoading}
                />
              </div>
            </div>
          ) : (
            <WelcomeScreen onImport={handleImport} />
          )}
        </div>
      </div>

      {/* Modals */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          initialImportType={importType}
        />
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

      {showUpdateModal && (
        <UpdateModal
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
}

export default App;
