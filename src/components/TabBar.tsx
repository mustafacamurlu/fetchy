import { X, Clock } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMethodBgColor } from '../utils/helpers';
import { useState, useRef } from 'react';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, getRequest } = useAppStore();
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleMouseEnter = (tabId: string) => {
    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      const rect = tabElement.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }
    setHoveredTab(tabId);
  };

  if (tabs.length === 0) return null;

  return (
    <div className="h-10 bg-aki-sidebar border-b border-aki-border flex items-center overflow-x-auto shrink-0">
      {/* Tooltip Portal */}
      {hoveredTab && (
        <div
          className="fixed px-3 py-1.5 bg-aki-bg border border-aki-border rounded-lg shadow-xl text-xs text-aki-text whitespace-nowrap z-[9999] pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {tabs.find(t => t.id === hoveredTab)?.title}
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
            className={`tab-item h-full flex items-center gap-2 px-3 cursor-pointer border-r border-aki-border min-w-[120px] max-w-[200px] group ${
              isActive ? 'bg-aki-bg' : 'bg-aki-sidebar hover:bg-aki-bg/50'
            }`}
            onClick={() => setActiveTab(tab.id)}
            onMouseEnter={() => handleMouseEnter(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            {/* History Badge */}
            {tab.isHistoryItem && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30 shrink-0"
              >
                <Clock size={10} />
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
            <span className="text-sm truncate flex-1 min-w-0">{tab.title}</span>

            {/* Modified Indicator */}
            {tab.isModified && (
              <span
                className="w-2 h-2 rounded-full bg-aki-accent shrink-0"
              />
            )}

            {/* Close Button */}
            <button
              className="tab-close-btn p-0.5 hover:bg-aki-border rounded shrink-0"
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

