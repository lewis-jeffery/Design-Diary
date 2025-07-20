export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CellOutput {
  position: Position;
  size: Size;
  content?: string;
  visible: boolean;
  stdout?: string;
  stderr?: string;
  success?: boolean;
  executionTime?: string;
  sessionId?: string;
}

export type CellType = 'code' | 'markdown' | 'raw';

export interface BaseCell {
  id: string;
  type: CellType;
  position: Position;
  size: Size;
  executionOrder: number | null; // null for cells that haven't been executed yet
  collapsed: boolean;
  collapsedSize: Size;
  selected: boolean;
  zIndex: number;
}

export interface CodeCell extends BaseCell {
  type: 'code';
  content: string;
  language: string;
  output?: CellOutput;
  firstCommentLines: string[];
  executionCount?: number;
}

export interface MarkdownCell extends BaseCell {
  type: 'markdown';
  content: string;
  // Design Diary specific properties for enhanced rendering
  renderingHints?: {
    contentType?: 'text' | 'equation' | 'image' | 'graph';
    fontSize?: number;
    fontFamily?: string;
    // For images
    src?: string;
    alt?: string;
    originalSize?: Size;
    // For equations
    latex?: string;
    displayMode?: boolean;
    // For graphs
    chartType?: string;
    data?: any;
    config?: any;
  };
}

export interface RawCell extends BaseCell {
  type: 'raw';
  content: string;
  format?: string; // e.g., 'html', 'latex', 'restructuredtext'
}

export type OutputFormat = 'text' | 'html' | 'image' | 'json' | 'error';

export interface RichOutput {
  format: OutputFormat;
  data: string;
  metadata?: {
    width?: number;
    height?: number;
    mimeType?: string;
  };
}

export type Cell = CodeCell | MarkdownCell | RawCell;

// Legacy types for backward compatibility during transition
export interface TextCell extends MarkdownCell {
  renderingHints: {
    fontSize: number;
    fontFamily: string;
  };
}

export interface ImageCell extends MarkdownCell {
  renderingHints: {
    src: string;
    alt: string;
    originalSize: Size;
  };
}

export interface OutputCell extends RawCell {
  outputs?: RichOutput[]; // Support multiple rich outputs
  stdout?: string;
  stderr?: string;
  success?: boolean;
  executionTime?: string;
  sessionId?: string;
  sourceCodeCellId: string; // Links back to the code cell that generated this output
  executionCount?: number;
}

export interface PageSize {
  width: number;
  height: number;
  name: string;
}

export interface CanvasState {
  zoom: number;
  pan: Position;
  gridSize: number;
  snapToGrid: boolean;
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  pages: number; // Number of pages currently available
  pageMargin: number; // Margin between pages
}

export interface DesignDiaryDocument {
  version: string;
  id: string;
  name: string;
  created: string;
  modified: string;
  canvas: CanvasState;
  cells: Cell[];
  executionHistory: number[];
}

export interface DragState {
  isDragging: boolean;
  draggedCellId: string | null;
  dragOffset: Position;
}

export interface SelectionState {
  selectedCellIds: string[];
  selectionBox: {
    start: Position;
    end: Position;
  } | null;
}

export interface SavedFileInfo {
  baseFileName: string | null; // e.g., "my_notebook" (without extension)
  lastSavedPath: string | null; // Full path where files were last saved
}

export interface AppState {
  document: DesignDiaryDocument;
  dragState: DragState;
  selectionState: SelectionState;
  isExecuting: boolean;
  executionQueue: string[];
  globalExecutionCount: number;
  savedFileInfo: SavedFileInfo;
}
