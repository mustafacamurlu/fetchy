import { X, Clock, FileCode, FolderCog } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMethodBgColor } from '../utils/helpers';
import { useState, useRef, useEffect, useCallback } from 'react';
import { TabState } from '../types';

export default function TabBar() {
  const {
    tabs, activeTabId, setActiveTab, closeTab, getRequest,
    updateRequest, updateCollection, updateEnvironment, updateOpenApiDocument,
  } = useAppStore();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus and select all text when an edit session starts
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTabId]);

  const handleDoubleClick = useCallback((e: React.MouseEvent, tab: TabState) => {
    e.preventDefault();
    e.stopPropagation();
    // History items cannot be renamed
    if (tab.isHistoryItem) return;
    setHoveredTab(null);
    setEditingTabId(tab.id);
    setEditingValue(tab.title);
  }, []);

  const commitRename = useCallback((tab: TabState, newName: string) => {
    const trimmed = newName.trim();
    setEditingTabId(null);
    if (!trimmed || trimmed === tab.title) return;

    if (tab.type === 'request' && tab.collectionId && tab.requestId) {
      updateRequest(tab.collectionId, tab.requestId, { name: trimmed });
    } else if (tab.type === 'collection' && tab.collectionId) {
      updateCollection(tab.collectionId, { name: trimmed });
    } else if (tab.type === 'environment' && tab.environmentId) {
      updateEnvironment(tab.environmentId, { name: trimmed });
    } else if (tab.type === 'openapi' && tab.openApiDocId) {
      updateOpenApiDocument(tab.openApiDocId, { name: trimmed });
    }
  }, [updateRequest, updateCollection, updateEnvironment, updateOpenApiDocument]);

  const handleMouseEnter = (tabId: string) => {
    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      const rect = tabElement.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
      setHoveredTab(tabId);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ tabId, x: e.clientX, y: e.clientY });
    setHoveredTab(null); // Hide tooltip when context menu opens
  };

  const handleCloseTabsToRight = (tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    const tabsToClose = tabs.slice(index + 1);
    tabsToClose.forEach(tab => closeTab(tab.id));
    setContextMenu(null);
  };

  const handleCloseTabsToLeft = (tabId: string) => {
    const index = tabs.findIndex(t => t.id === tabId);
    const tabsToClose = tabs.slice(0, index);
    tabsToClose.forEach(tab => closeTab(tab.id));
    setContextMenu(null);
  };

  const handleCloseOtherTabs = (tabId: string) => {
    const tabsToClose = tabs.filter(t => t.id !== tabId);
    tabsToClose.forEach(tab => closeTab(tab.id));
    setContextMenu(null);
  };

  const handleCloseAllTabs = () => {
    tabs.forEach(tab => closeTab(tab.id));
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  if (tabs.length === 0) return null;

  return (
    <div className="h-10 bg-fetchy-tab-bar border-b border-fetchy-border flex items-center overflow-x-auto shrink-0">
      {/* Tooltip Portal */}
      {hoveredTab && (
        <div
          className="fixed px-3 py-1.5 bg-fetchy-tooltip border border-fetchy-border rounded-lg shadow-xl text-xs text-fetchy-text whitespace-nowrap z-[9999] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tabs.find(t => t.id === hoveredTab)?.title}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-fetchy-dropdown border border-fetchy-border rounded-lg shadow-xl py-1 z-[10000] min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-fetchy-text hover:bg-fetchy-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleCloseTabsToRight(contextMenu.tabId)}
            disabled={tabs.findIndex(t => t.id === contextMenu.tabId) === tabs.length - 1}
          >
            Close Tabs to Right
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-fetchy-text hover:bg-fetchy-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleCloseTabsToLeft(contextMenu.tabId)}
            disabled={tabs.findIndex(t => t.id === contextMenu.tabId) === 0}
          >
            Close Tabs to Left
          </button>
          <button
            className="w-full px-4 py-2 text-left text-sm text-fetchy-text hover:bg-fetchy-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleCloseOtherTabs(contextMenu.tabId)}
            disabled={tabs.length === 1}
          >
            Close Other Tabs
          </button>
          <div className="border-t border-fetchy-border my-1" />
          <button
            className="w-full px-4 py-2 text-left text-sm text-fetchy-text hover:bg-fetchy-bg transition-colors"
            onClick={handleCloseAllTabs}
          >
            Close All Tabs
          </button>
        </div>
      )}

      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;

        // Get request from store or history
        let request = tab.requestId && tab.collectionId
          ? getRequest(tab.collectionId, tab.requestId)
          : null;

        // If this is a history item, use the history request
        if (tab.isHistoryItem && tab.historyRequest) {
          request = tab.historyRequest;
        }

        return (
          <div
            key={tab.id}
            ref={(el) => (tabRefs.current[tab.id] = el)}
            className={`tab-item h-full flex items-center gap-2 px-3 cursor-pointer border-r border-fetchy-border min-w-[120px] max-w-[200px] group ${
              isActive ? 'bg-fetchy-tab-active' : 'bg-fetchy-tab-bar hover:bg-fetchy-tab-active/50'
            }`}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            onMouseDown={(e) => {
              // Middle click (button 1) closes the tab
              if (e.button === 1) {
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            onMouseEnter={() => !editingTabId && handleMouseEnter(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            onDoubleClick={(e) => handleDoubleClick(e, tab)}
          >
            {/* History Badge */}
            {tab.isHistoryItem && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 shrink-0"
              >
                <Clock size={10} />
              </span>
            )}

            {/* OpenAPI Badge */}
            {tab.type === 'openapi' && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded border border-purple-500/30 shrink-0"
              >
                <FileCode size={10} />
              </span>
            )}

            {/* Collection Badge */}
            {tab.type === 'collection' && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 shrink-0"
              >
                <FolderCog size={10} />
              </span>
            )}

            {/* HTTP Method Badge - Show for all request tabs */}
            {request && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 w-[52px] text-center ${getMethodBgColor(request.method)}`}
              >
                {request.method}
              </span>
            )}

            {/* Tab Title */}
            {editingTabId === tab.id ? (
              <input
                ref={editInputRef}
                className="text-sm flex-1 min-w-0 bg-fetchy-input border border-fetchy-accent rounded px-1 outline-none text-fetchy-text w-full"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => commitRename(tab, editingValue)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename(tab, editingValue);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingTabId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm truncate flex-1 min-w-0">{tab.title}</span>
            )}

            {/* Modified Indicator */}
            {tab.isModified && (
              <span
                className="w-2 h-2 rounded-full bg-fetchy-accent shrink-0"
              />
            )}

            {/* Close Button */}
            <button
              className="tab-close-btn p-0.5 hover:bg-fetchy-border rounded shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

