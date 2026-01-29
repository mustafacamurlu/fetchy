import { X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getMethodBgColor } from '../utils/helpers';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab, getRequest } = useAppStore();

  if (tabs.length === 0) return null;

  return (
    <div className="h-10 bg-aki-sidebar border-b border-aki-border flex items-center overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const request = tab.requestId && tab.collectionId
          ? getRequest(tab.collectionId, tab.requestId)
          : null;

        return (
          <div
            key={tab.id}
            className={`tab-item h-full flex items-center gap-2 px-3 cursor-pointer border-r border-aki-border min-w-[120px] max-w-[200px] group ${
              isActive ? 'bg-aki-bg' : 'bg-aki-sidebar hover:bg-aki-bg/50'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {request && (
              <span className={`text-xs font-bold px-1 py-0.5 rounded ${getMethodBgColor(request.method)}`}>
                {request.method.substring(0, 3)}
              </span>
            )}
            <span className="text-sm truncate flex-1">{tab.title}</span>
            {tab.isModified && (
              <span className="w-2 h-2 rounded-full bg-aki-accent shrink-0" />
            )}
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

