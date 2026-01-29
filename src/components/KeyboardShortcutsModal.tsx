import { X, Keyboard } from 'lucide-react';
import { keyboardShortcuts } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-aki-card border border-aki-border rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aki-border">
          <div className="flex items-center gap-3">
            <Keyboard className="text-aki-accent" size={24} />
            <h2 className="text-xl font-semibold text-aki-text">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            {keyboardShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-aki-border/50 last:border-0"
              >
                <span className="text-aki-text-muted">{shortcut.description}</span>
                <kbd className="px-2 py-1 bg-aki-sidebar border border-aki-border rounded text-sm font-mono text-aki-text">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-aki-border bg-aki-sidebar">
          <button onClick={onClose} className="btn btn-primary">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

