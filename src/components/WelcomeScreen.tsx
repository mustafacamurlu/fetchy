import { Zap, FolderOpen, FileJson } from 'lucide-react';
import { useAppStore } from '../store/appStore';

interface WelcomeScreenProps {
  onImport: () => void;
}

export default function WelcomeScreen({ onImport }: WelcomeScreenProps) {
  const { addCollection, addRequest, openTab } = useAppStore();

  const handleQuickStart = () => {
    const collection = addCollection('My Collection');
    const request = addRequest(collection.id, null, {
      name: 'My First Request',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
    });
    openTab({
      type: 'request',
      title: request.name,
      requestId: request.id,
      collectionId: collection.id,
    });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-aki-bg p-8">
      <div className="text-center max-w-2xl">
        <img src="./logo.jpg" alt="Fetchy" className="w-32 h-32 rounded-xl mx-auto mb-6 shadow-lg" />
        <h1 className="text-3xl font-bold text-aki-text mb-2">
          Welcome to Fetchy
        </h1>
        <p className="text-aki-accent italic mb-4">Local by design. Reliable by nature.</p>
        <p className="text-aki-text-muted mb-8">
          A powerful, offline-capable REST API client for testing and debugging your APIs.
          Import collections from Postman or OpenAPI specs, or start fresh.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleQuickStart}
            className="p-6 bg-aki-card border border-aki-border rounded-lg hover:border-aki-accent transition-colors group"
          >
            <Zap className="w-8 h-8 text-aki-accent mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-aki-text mb-2">Quick Start</h3>
            <p className="text-sm text-aki-text-muted">
              Create a new collection with a sample request
            </p>
          </button>

          <button
            onClick={onImport}
            className="p-6 bg-aki-card border border-aki-border rounded-lg hover:border-aki-accent transition-colors group"
          >
            <FolderOpen className="w-8 h-8 text-yellow-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-aki-text mb-2">Import Postman</h3>
            <p className="text-sm text-aki-text-muted">
              Import your existing Postman collections
            </p>
          </button>

          <button
            onClick={onImport}
            className="p-6 bg-aki-card border border-aki-border rounded-lg hover:border-aki-accent transition-colors group"
          >
            <FileJson className="w-8 h-8 text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-medium text-aki-text mb-2">Import OpenAPI</h3>
            <p className="text-sm text-aki-text-muted">
              Generate requests from OpenAPI/Swagger specs
            </p>
          </button>
        </div>

        <div className="bg-aki-card/50 border border-aki-border rounded-lg p-6">
          <h3 className="font-medium text-aki-text mb-4">Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-aki-text-muted">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> REST Collections
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Environment Variables
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Multiple Auth Types
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Request History
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> OpenAPI Import
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Postman Import
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> JSON Editor
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Offline Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

