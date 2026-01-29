import { useState } from 'react';
import { X, Download, FileJson, Check } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { exportToPostman } from '../utils/helpers';

interface ExportModalProps {
  onClose: () => void;
  collectionId?: string;
}

export default function ExportModal({ onClose, collectionId }: ExportModalProps) {
  const { collections } = useAppStore();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    collectionId || (collections.length > 0 ? collections[0].id : '')
  );
  const [exportFormat, setExportFormat] = useState<'postman' | 'aki'>('postman');
  const [success, setSuccess] = useState<string | null>(null);

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);

  const handleExport = () => {
    if (!selectedCollection) return;

    let content: string;
    let filename: string;

    if (exportFormat === 'postman') {
      content = exportToPostman(selectedCollection);
      filename = `${selectedCollection.name.replace(/\s+/g, '_')}.postman_collection.json`;
    } else {
      // Aki native format (JSON with all data)
      content = JSON.stringify(selectedCollection, null, 2);
      filename = `${selectedCollection.name.replace(/\s+/g, '_')}.aki.json`;
    }

    // Create download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSuccess(`Successfully exported "${selectedCollection.name}"`);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-aki-card border border-aki-border rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-aki-border">
          <h2 className="text-xl font-semibold text-aki-text">Export Collection</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-aki-border rounded text-aki-text-muted hover:text-aki-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {collections.length === 0 ? (
            <div className="text-center py-8 text-aki-text-muted">
              <p>No collections to export</p>
              <p className="text-sm mt-2">Create a collection first</p>
            </div>
          ) : (
            <>
              {/* Collection selection */}
              <div className="mb-6">
                <label className="block text-sm text-aki-text-muted mb-2">Select Collection</label>
                <select
                  value={selectedCollectionId}
                  onChange={(e) => setSelectedCollectionId(e.target.value)}
                  className="w-full"
                >
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name} ({collection.requests.length + collection.folders.reduce((acc, f) => acc + f.requests.length, 0)} requests)
                    </option>
                  ))}
                </select>
              </div>

              {/* Export format selection */}
              <div className="mb-6">
                <label className="block text-sm text-aki-text-muted mb-2">Export Format</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setExportFormat('postman')}
                    className={`flex-1 p-4 border rounded-lg flex items-center gap-3 transition-colors ${
                      exportFormat === 'postman'
                        ? 'border-aki-accent bg-aki-accent/10'
                        : 'border-aki-border hover:border-aki-accent/50'
                    }`}
                  >
                    <FileJson className={`w-6 h-6 ${exportFormat === 'postman' ? 'text-aki-accent' : 'text-orange-400'}`} />
                    <div className="text-left">
                      <div className="font-medium text-aki-text">Postman</div>
                      <div className="text-xs text-aki-text-muted">v2.1 compatible</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setExportFormat('aki')}
                    className={`flex-1 p-4 border rounded-lg flex items-center gap-3 transition-colors ${
                      exportFormat === 'aki'
                        ? 'border-aki-accent bg-aki-accent/10'
                        : 'border-aki-border hover:border-aki-accent/50'
                    }`}
                  >
                    <FileJson className={`w-6 h-6 ${exportFormat === 'aki' ? 'text-aki-accent' : 'text-blue-400'}`} />
                    <div className="text-left">
                      <div className="font-medium text-aki-text">Aki Native</div>
                      <div className="text-xs text-aki-text-muted">Full backup</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Success message */}
              {success && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400">
                  <Check size={18} />
                  <span className="text-sm">{success}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-aki-border bg-aki-sidebar">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!selectedCollection}
            className="btn btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>
    </div>
  );
}

