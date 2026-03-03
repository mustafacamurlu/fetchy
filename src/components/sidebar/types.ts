import { HttpMethod } from '../../types';

export type SortOption = 'name-asc' | 'name-desc' | 'method' | 'created';
export type FilterMethod = HttpMethod | 'all';

export interface DragItem {
  type: 'collection' | 'folder' | 'request' | 'api-doc';
  id: string;
  collectionId: string;
  folderId?: string;
  index: number;
}

/** State describing the currently-open right-click context menu */
export interface ContextMenuState {
  x: number;
  y: number;
  type: 'collection' | 'folder' | 'request';
  collectionId: string;
  folderId?: string;
  requestId?: string;
}

/** Shared editing props passed down to each sortable item */
export interface EditingProps {
  editingId: string | null;
  editingName: string;
  setEditingName: (name: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onEditComplete: () => void;
}
