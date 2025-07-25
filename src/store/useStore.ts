import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Cell, Position, Size, DesignDiaryDocument, RecentFile, PageSize } from '../types';
import { pythonExecutionService } from '../services/pythonExecutionService';
import { JupyterConversionService } from '../services/jupyterConversionService';
import { JupyterNotebook, DesignDiaryLayout } from '../types/jupyter';

// Standard page sizes in pixels (at 96 DPI)
export const PAGE_SIZES: Record<string, PageSize> = {
  A4: { width: 794, height: 1123, name: 'A4' },
  A3: { width: 1123, height: 1587, name: 'A3' },
  A5: { width: 559, height: 794, name: 'A5' },
  Letter: { width: 816, height: 1056, name: 'Letter' },
  Legal: { width: 816, height: 1344, name: 'Legal' },
  Tabloid: { width: 1056, height: 1632, name: 'Tabloid' },
};

const createInitialDocument = (): DesignDiaryDocument => ({
  version: '1.0.0',
  id: uuidv4(),
  name: 'Untitled Design Diary',
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  canvas: {
    zoom: 1.0,
    pan: { x: 0, y: 0 }, // Start with pages visible in viewport
    gridSize: 20,
    snapToGrid: true,
    pageSize: PAGE_SIZES.A4,
    orientation: 'landscape',
    pages: 1,
    pageMargin: 50,
  },
  cells: [],
  executionHistory: [],
});

interface StoreActions {
  // Document actions
  createNewDocument: () => void;
  loadDocument: (document: DesignDiaryDocument) => void;
  saveDocument: () => string;
  
  // Save/Save As actions
  saveAsJupyter: () => void; // Save As - prompts for filename and saves both files
  saveJupyter: () => void;   // Save - silently overwrites existing files
  setSavedFileInfo: (baseFileName: string, path: string) => void;
  
  // Jupyter compatibility actions
  exportToJupyter: () => { notebook: string; layout: string };
  importFromJupyter: (notebook: JupyterNotebook, layout: DesignDiaryLayout) => void;
  registerWorkingDirectory: (documentId: string, workingDirectory: string) => Promise<void>;
  getCurrentWorkingDirectory: () => Promise<string>;
  
  // Cell actions
  addCell: (type: Cell['type'], position: Position, renderingHint?: string, insertAfterCellId?: string) => void;
  updateCell: (cellId: string, updates: Partial<Cell>) => void;
  deleteCell: (cellId: string) => void;
  duplicateCell: (cellId: string) => void;
  renumberCodeCells: () => void;
  
  // Position and size actions
  updateCellPosition: (cellId: string, position: Position) => void;
  updateCellSize: (cellId: string, size: Size) => void;
  
  // Selection actions
  selectCell: (cellId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  selectMultipleCells: (cellIds: string[]) => void;
  
  // Canvas actions
  updateCanvasZoom: (zoom: number) => void;
  updateCanvasPan: (pan: Position) => void;
  toggleSnapToGrid: () => void;
  updatePageSize: (pageSize: PageSize) => void;
  updatePageOrientation: (orientation: 'portrait' | 'landscape') => void;
  
  // Execution actions
  executeCell: (cellId: string) => Promise<void>;
  executeCells: (cellIds: string[]) => void;
  updateExecutionOrder: () => void;
  
  // Drag actions
  startDrag: (cellId: string, offset: Position) => void;
  updateDrag: (position: Position) => void;
  endDrag: () => void;
  
  // Collapse actions
  toggleCellCollapse: (cellId: string) => void;
  
  // Recent files actions
  addRecentFile: (filePath: string) => Promise<void>;
  getRecentFiles: () => Promise<RecentFile[]>;
  loadRecentFiles: () => Promise<RecentFile[]>;
}

// Helper function to load recent files from server
const loadRecentFilesFromServer = async (): Promise<RecentFile[]> => {
  try {
    console.log('🔍 Loading recent files from server...');
    const response = await fetch('http://localhost:3001/api/recent-files');
    
    if (!response.ok) {
      console.warn('❌ Failed to load recent files from server:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    console.log('🔍 Server response:', data);
    
    if (data.recentFiles && Array.isArray(data.recentFiles)) {
      console.log('✅ Valid recent files loaded from server:', data.recentFiles.length, data.recentFiles);
      return data.recentFiles;
    }
    
    console.log('🔍 No recent files found on server');
    return [];
  } catch (error) {
    console.warn('❌ Failed to load recent files from server:', error);
    return [];
  }
};

// Helper function to save recent file to server
const saveRecentFileToServer = async (filePath: string): Promise<boolean> => {
  try {
    console.log('💾 Saving recent file to server:', filePath);
    const response = await fetch('http://localhost:3001/api/recent-files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath }),
    });
    
    if (!response.ok) {
      console.warn('❌ Failed to save recent file to server:', response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Recent file saved to server:', data.message);
    return true;
  } catch (error) {
    console.warn('❌ Failed to save recent file to server:', error);
    return false;
  }
};

export const useStore = create<AppState & StoreActions>((set, get) => {
  // Create initial document
  const initialDocument = createInitialDocument();
  
  return {
  // Initial state
  document: initialDocument,
  dragState: {
    isDragging: false,
    draggedCellId: null,
    dragOffset: { x: 0, y: 0 },
  },
  selectionState: {
    selectedCellIds: [],
    selectionBox: null,
  },
  isExecuting: false,
  executionQueue: [],
  globalExecutionCount: 0,
  savedFileInfo: {
    baseFileName: null,
    lastSavedPath: null,
  },
  recentFiles: [], // Will be loaded asynchronously from server

  // Document actions
  createNewDocument: () => {
    const newDocument = createInitialDocument();
    set({ document: newDocument });
    
    // Register the current working directory for this new document
    get().registerWorkingDirectory(newDocument.id, '/Users/lewis/opt/design-diary');
  },

  loadDocument: (document: DesignDiaryDocument) => {
    set({ document });
    
    // Register the current working directory for this loaded document
    get().registerWorkingDirectory(document.id, '/Users/lewis/opt/design-diary');
  },

  saveDocument: () => {
    const { document } = get();
    const updatedDocument = {
      ...document,
      modified: new Date().toISOString(),
    };
    set({ document: updatedDocument });
    return JSON.stringify(updatedDocument, null, 2);
  },

  // Jupyter compatibility actions
  exportToJupyter: () => {
    const { document } = get();
    const result = JupyterConversionService.toJupyterFormat(document);
    return {
      notebook: JSON.stringify(result.notebook, null, 2),
      layout: JSON.stringify(result.layout, null, 2)
    };
  },

  importFromJupyter: (notebook: JupyterNotebook, layout: DesignDiaryLayout) => {
    const document = JupyterConversionService.fromJupyterFormat(notebook, layout);
    // Ensure all imported cells are not selected
    const documentWithClearedSelection = {
      ...document,
      cells: document.cells.map(cell => ({ ...cell, selected: false }))
    };
    
    // Clear selection state first
    set({
      selectionState: {
        selectedCellIds: [],
        selectionBox: null,
      }
    });
    
    // Set the document
    set({ document: documentWithClearedSelection });
    
    // Clear selection again after a short delay to handle any async selection
    setTimeout(() => {
      get().clearSelection();
    }, 100);
  },

  registerWorkingDirectory: async (documentId: string, workingDirectory: string) => {
    try {
      console.log('Attempting to register working directory:', { documentId, workingDirectory });
      
      const response = await fetch('http://localhost:3001/api/register-working-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          workingDirectory,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to register working directory:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return;
      }

      const result = await response.json();
      console.log('Working directory registered successfully:', result);
    } catch (error) {
      console.error('Error registering working directory:', error);
      // Don't throw the error, just log it so the app continues to work
    }
  },

  getCurrentWorkingDirectory: async () => {
    try {
      const { document } = get();
      const response = await fetch(`http://localhost:3001/api/working-directory/${document.id}`);
      
      if (!response.ok) {
        console.warn('Failed to get working directory from server, using default');
        return '/Users/lewis/opt/design-diary';
      }
      
      const result = await response.json();
      return result.workingDirectory || '/Users/lewis/opt/design-diary';
    } catch (error) {
      console.warn('Error getting working directory:', error);
      return '/Users/lewis/opt/design-diary';
    }
  },

  // Save/Save As actions
  setSavedFileInfo: (baseFileName: string, path: string) => {
    set({
      savedFileInfo: {
        baseFileName,
        lastSavedPath: path,
      },
    });
  },

  saveAsJupyter: async () => {
    const { document } = get();
    
    // Prompt user for file path
    const filePath = prompt(
      'Enter the full path where you want to save the notebook:\n\n' +
      'Example: /Users/username/Documents/my-project/notebook.ipynb\n\n' +
      'The server will automatically save both .ipynb and .layout.json files.'
    );
    
    if (!filePath || !filePath.trim()) {
      return; // User cancelled
    }
    
    const cleanPath = filePath.trim();
    
    // Ensure the path ends with .ipynb
    const notebookPath = cleanPath.endsWith('.ipynb') ? cleanPath : `${cleanPath}.ipynb`;
    
    try {
      const { notebook, layout } = get().exportToJupyter();
      
      // Call server to save the files
      const response = await fetch('http://localhost:3001/api/save-notebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notebookPath,
          notebookContent: notebook,
          layoutContent: layout,
          silent: false
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notebook');
      }
      
      const result = await response.json();
      console.log('Save result:', result);
      
      // Extract filename from path for saved file info
      const fileName = notebookPath.split('/').pop()?.replace('.ipynb', '') || 'notebook';
      
      // Save the file info for future quick saves
      get().setSavedFileInfo(fileName, notebookPath);
      
      alert(`Successfully saved:\n• ${result.notebookPath}\n• ${result.layoutPath}`);
      
    } catch (error) {
      console.error('Save error:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  saveJupyter: async () => {
    const { savedFileInfo } = get();
    
    if (!savedFileInfo.baseFileName || !savedFileInfo.lastSavedPath) {
      // If no previous save, fall back to Save As
      get().saveAsJupyter();
      return;
    }

    try {
      const { notebook, layout } = get().exportToJupyter();
      
      // Use the previously saved path
      const notebookPath = savedFileInfo.lastSavedPath;
      
      // Call server to save the files silently
      const response = await fetch('http://localhost:3001/api/save-notebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notebookPath,
          notebookContent: notebook,
          layoutContent: layout,
          silent: true // Silent save - no console logging
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notebook');
      }
      
      const result = await response.json();
      console.log('Silent save completed:', result.notebookPath);
      
    } catch (error) {
      console.error('Save error:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Helper function to renumber all code cells sequentially
  renumberCodeCells: () => {
    const { document } = get();
    const codeCells = document.cells
      .filter(cell => cell.type === 'code')
      .sort((a, b) => {
        // Sort by current execution order, then by position (top to bottom, left to right)
        if (a.executionOrder !== null && b.executionOrder !== null) {
          return a.executionOrder - b.executionOrder;
        }
        if (a.executionOrder !== null) return -1;
        if (b.executionOrder !== null) return 1;
        // If both are null, sort by position
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });

    // Renumber sequentially
    const updatedCells = document.cells.map(cell => {
      if (cell.type === 'code') {
        const index = codeCells.findIndex(c => c.id === cell.id);
        return { ...cell, executionOrder: index + 1 };
      }
      return cell;
    });

    set({
      document: {
        ...document,
        cells: updatedCells,
        modified: new Date().toISOString(),
      },
    });
  },

  // Cell actions
  addCell: (type: Cell['type'], position: Position, renderingHint?: string, insertAfterCellId?: string) => {
    const { document, selectionState } = get();
    
    // Clear any existing selection first
    get().clearSelection();
    
    // Determine insertion logic for code cells
    let executionOrder: number | null = null;
    if (type === 'code') {
      // Get all existing code cells sorted by execution order
      const existingCodeCells = document.cells
        .filter(cell => cell.type === 'code')
        .sort((a, b) => {
          if (a.executionOrder === null && b.executionOrder === null) return 0;
          if (a.executionOrder === null) return 1;
          if (b.executionOrder === null) return -1;
          return a.executionOrder - b.executionOrder;
        });

      // Determine where to insert based on selection or insertAfterCellId
      let insertAfterOrder: number | null = null;
      
      if (insertAfterCellId) {
        // Find the specified cell to insert after
        const insertAfterCell = document.cells.find(c => c.id === insertAfterCellId);
        if (insertAfterCell && insertAfterCell.type === 'code') {
          insertAfterOrder = insertAfterCell.executionOrder;
        }
      } else if (selectionState.selectedCellIds.length > 0) {
        // Use the last selected code cell
        const selectedCodeCells = document.cells
          .filter(c => c.type === 'code' && selectionState.selectedCellIds.includes(c.id))
          .sort((a, b) => {
            if (a.executionOrder === null && b.executionOrder === null) return 0;
            if (a.executionOrder === null) return 1;
            if (b.executionOrder === null) return -1;
            return a.executionOrder - b.executionOrder;
          });
        
        if (selectedCodeCells.length > 0) {
          const lastSelected = selectedCodeCells[selectedCodeCells.length - 1];
          insertAfterOrder = lastSelected.executionOrder;
        }
      }

      // Determine the new execution order
      if (insertAfterOrder !== null) {
        // Insert after the specified cell - need to renumber subsequent cells
        executionOrder = insertAfterOrder + 1;
        
        // Renumber all code cells that come after the insertion point
        const cellsToRenumber = existingCodeCells.filter(c => 
          c.executionOrder !== null && c.executionOrder >= executionOrder!
        );
        
        console.log('🔧 DEBUG: Inserting code cell at execution order', executionOrder);
        console.log('🔧 DEBUG: Will renumber', cellsToRenumber.length, 'subsequent cells');
        
        // Update execution orders for subsequent cells
        cellsToRenumber.forEach(cell => {
          if (cell.executionOrder !== null) {
            get().updateCell(cell.id, { executionOrder: cell.executionOrder + 1 });
          }
        });
      } else {
        // No insertion point specified - add at the end
        executionOrder = existingCodeCells.length + 1;
        console.log('🔧 DEBUG: Adding code cell at end with execution order', executionOrder);
      }
    }
    
    const baseCell = {
      id: uuidv4(),
      position,
      size: { width: 300, height: 200 },
      executionOrder,
      collapsed: false,
      collapsedSize: { width: 300, height: 50 },
      selected: true, // Create cell as selected
      zIndex: document.cells.length + 10, // Ensure cells are always above pages (z-index: 1)
    };

    let newCell: Cell;

    // Type-specific cell creation aligned with JupyterLab
    switch (type) {
      case 'code':
        newCell = {
          ...baseCell,
          type: 'code',
          content: '# Enter your code here\nprint("Hello, World!")',
          language: 'python',
          firstCommentLines: ['# Enter your code here'],
          executionCount: undefined, // Execution count is separate from sequence order
        };
        break;
      case 'markdown':
        // Create markdown cell with rendering hints for specialized content
        const contentType = renderingHint || 'text';
        let content = 'Enter your text here...';
        let hints: any = { contentType: 'text' };

        switch (contentType) {
          case 'text':
            content = 'Enter your text here...';
            hints = {
              contentType: 'text',
              fontSize: 14,
              fontFamily: 'Arial, sans-serif'
            };
            break;
          case 'equation':
            content = '$$E = mc^2$$';
            hints = {
              contentType: 'equation',
              latex: 'E = mc^2',
              displayMode: true
            };
            break;
          case 'image':
            content = '![Image](image-placeholder)';
            hints = {
              contentType: 'image',
              src: '',
              alt: 'Image',
              originalSize: { width: 300, height: 200 }
            };
            break;
          case 'graph':
            content = '<!-- Graph placeholder -->';
            hints = {
              contentType: 'graph',
              chartType: 'line',
              data: {},
              config: {}
            };
            break;
        }

        newCell = {
          ...baseCell,
          type: 'markdown',
          content,
          renderingHints: hints
        };
        break;
      case 'raw':
        newCell = {
          ...baseCell,
          type: 'raw',
          content: '',
          format: 'text'
        };
        break;
      default:
        throw new Error(`Unknown cell type: ${type}`);
    }

    const updatedDocument = {
      ...document,
      cells: [...document.cells, newCell],
      modified: new Date().toISOString(),
    };
    
    // Update both document and selection state at the same time
    set({ 
      document: updatedDocument,
      selectionState: {
        selectedCellIds: [newCell.id],
        selectionBox: null,
      }
    });
    
    // Debug: Log the newly created cell details
    console.log('🔧 DEBUG: Created new cell:');
    console.log('  ID:', newCell.id);
    console.log('  Type:', newCell.type);
    console.log('  Execution Order:', newCell.executionOrder);
    console.log('  Position x:', newCell.position.x, 'y:', newCell.position.y);
    console.log('  Size width:', newCell.size.width, 'height:', newCell.size.height);
    console.log('  Selected:', newCell.selected);
    console.log('  zIndex:', newCell.zIndex);
  },

  updateCell: (cellId: string, updates: Partial<Cell>) => {
    const { document } = get();
    
    try {
      // Validate the updates object
      if (!updates || typeof updates !== 'object') {
        console.warn('Invalid updates object:', updates);
        return;
      }
      
      // Find the cell to update
      const cellIndex = document.cells.findIndex(cell => cell.id === cellId);
      if (cellIndex === -1) {
        console.warn('Cell not found:', cellId);
        return;
      }
      
      const originalCell = document.cells[cellIndex];
      
      // Create a safe update that preserves the original cell structure
      const updatedCell: Cell = {
        ...originalCell,
        ...updates,
        // Ensure critical properties are preserved and valid
        id: originalCell.id,
        type: originalCell.type,
        // Validate position if being updated
        position: updates.position ? {
          x: typeof updates.position.x === 'number' && !isNaN(updates.position.x) ? updates.position.x : originalCell.position.x,
          y: typeof updates.position.y === 'number' && !isNaN(updates.position.y) ? updates.position.y : originalCell.position.y,
        } : originalCell.position,
        // Validate size if being updated
        size: updates.size ? {
          width: typeof updates.size.width === 'number' && !isNaN(updates.size.width) ? updates.size.width : originalCell.size.width,
          height: typeof updates.size.height === 'number' && !isNaN(updates.size.height) ? updates.size.height : originalCell.size.height,
        } : originalCell.size,
      } as Cell;
      
      // Create new cells array with the updated cell
      const newCells = [...document.cells];
      newCells[cellIndex] = updatedCell;
      
      const newDocument = {
        ...document,
        cells: newCells,
        modified: new Date().toISOString(),
      };
      
      set({ document: newDocument });
    } catch (error) {
      console.error('Error updating cell:', error);
      // Don't update if there's an error
    }
  },

  deleteCell: (cellId: string) => {
    const { document } = get();
    const cellToDelete = document.cells.find(cell => cell.id === cellId);
    const wasCodeCell = cellToDelete?.type === 'code';
    
    set({
      document: {
        ...document,
        cells: document.cells.filter(cell => cell.id !== cellId),
        modified: new Date().toISOString(),
      },
    });
    
    // If we deleted a code cell, renumber all remaining code cells
    if (wasCodeCell) {
      setTimeout(() => get().renumberCodeCells(), 0);
    }
  },

  duplicateCell: (cellId: string) => {
    const { document } = get();
    const cellToDuplicate = document.cells.find(cell => cell.id === cellId);
    if (cellToDuplicate) {
      // For code cells, assign the next sequential number immediately
      let newExecutionOrder = cellToDuplicate.executionOrder;
      if (cellToDuplicate.type === 'code') {
        const existingCodeCells = document.cells.filter(cell => cell.type === 'code');
        newExecutionOrder = existingCodeCells.length + 1; // Next sequential number
      }
      
      const duplicatedCell: Cell = {
        ...cellToDuplicate,
        id: uuidv4(),
        position: {
          x: cellToDuplicate.position.x + 20,
          y: cellToDuplicate.position.y + 20,
        },
        executionOrder: newExecutionOrder,
        selected: false,
      };

      set({
        document: {
          ...document,
          cells: [...document.cells, duplicatedCell],
          modified: new Date().toISOString(),
        },
      });
      
      // No need to call renumberCodeCells since we assigned the correct number immediately
    }
  },

  // Position and size actions
  updateCellPosition: (cellId: string, position: Position) => {
    try {
      // Validate position values
      if (typeof position.x !== 'number' || typeof position.y !== 'number' || 
          isNaN(position.x) || isNaN(position.y)) {
        console.warn('Invalid position values:', position);
        return;
      }
      
      // Ensure non-negative positions
      const safePosition = {
        x: Math.max(0, position.x),
        y: Math.max(0, position.y)
      };
      
      get().updateCell(cellId, { position: safePosition });
    } catch (error) {
      console.error('Error updating cell position:', error);
    }
  },

  updateCellSize: (cellId: string, size: Size) => {
    try {
      // Validate size values
      if (typeof size.width !== 'number' || typeof size.height !== 'number' || 
          isNaN(size.width) || isNaN(size.height)) {
        console.warn('Invalid size values:', size);
        return;
      }
      
      // Ensure minimum size
      const safeSize = {
        width: Math.max(100, size.width),
        height: Math.max(50, size.height)
      };
      
      get().updateCell(cellId, { size: safeSize });
    } catch (error) {
      console.error('Error updating cell size:', error);
    }
  },

  // Selection actions
  selectCell: (cellId: string, multiSelect = false) => {
    const { selectionState } = get();
    let newSelectedIds: string[];

    if (multiSelect) {
      newSelectedIds = selectionState.selectedCellIds.includes(cellId)
        ? selectionState.selectedCellIds.filter(id => id !== cellId)
        : [...selectionState.selectedCellIds, cellId];
    } else {
      newSelectedIds = [cellId];
    }

    set({
      selectionState: {
        ...selectionState,
        selectedCellIds: newSelectedIds,
      },
    });

    // Update cell selection state
    const { document } = get();
    set({
      document: {
        ...document,
        cells: document.cells.map(cell => ({
          ...cell,
          selected: newSelectedIds.includes(cell.id),
        })),
      },
    });
  },

  clearSelection: () => {
    const { document } = get();
    set({
      selectionState: {
        selectedCellIds: [],
        selectionBox: null,
      },
      document: {
        ...document,
        cells: document.cells.map(cell => ({ ...cell, selected: false })),
      },
    });
  },

  selectMultipleCells: (cellIds: string[]) => {
    const { document } = get();
    set({
      selectionState: {
        selectedCellIds: cellIds,
        selectionBox: null,
      },
      document: {
        ...document,
        cells: document.cells.map(cell => ({
          ...cell,
          selected: cellIds.includes(cell.id),
        })),
      },
    });
  },

  // Canvas actions
  updateCanvasZoom: (zoom: number) => {
    const { document } = get();
    set({
      document: {
        ...document,
        canvas: { ...document.canvas, zoom },
      },
    });
  },

  updateCanvasPan: (pan: Position) => {
    const { document } = get();
    set({
      document: {
        ...document,
        canvas: { ...document.canvas, pan },
      },
    });
  },

  toggleSnapToGrid: () => {
    const { document } = get();
    set({
      document: {
        ...document,
        canvas: {
          ...document.canvas,
          snapToGrid: !document.canvas.snapToGrid,
        },
      },
    });
  },

  updatePageSize: (pageSize: PageSize) => {
    const { document } = get();
    set({
      document: {
        ...document,
        canvas: {
          ...document.canvas,
          pageSize,
        },
        modified: new Date().toISOString(),
      },
    });
  },

  updatePageOrientation: (orientation: 'portrait' | 'landscape') => {
    const { document } = get();
    set({
      document: {
        ...document,
        canvas: {
          ...document.canvas,
          orientation,
        },
        modified: new Date().toISOString(),
      },
    });
  },

  // Execution actions
  executeCell: async (cellId: string) => {
    const { document, globalExecutionCount } = get();
    const cell = document.cells.find(c => c.id === cellId);
    
    if (!cell || cell.type !== 'code') {
      console.warn(`Cell ${cellId} not found or not a code cell`);
      return;
    }

    // Set execution state and increment global execution count
    const newExecutionCount = globalExecutionCount + 1;
    set({ isExecuting: true, globalExecutionCount: newExecutionCount });

    // Find any existing output cells for this code cell
    const currentDocument = get().document;
    const existingOutputCells = currentDocument.cells.filter(c => {
      if (c.type !== 'raw') return false;
      const rawCell = c as any;
      return rawCell.sourceCodeCellId === cellId;
    });
    
    // Store positions of existing output cells for reuse - sort by position for consistent ordering
    const savedPositions = existingOutputCells
      .sort((a, b) => a.position.y - b.position.y) // Sort by Y position (top to bottom)
      .map((cell) => ({
        position: cell.position,
        size: cell.size,
        outputType: (cell as any).outputType || 'text'
      }));
    
    console.log('🔧 DEBUG: Found', existingOutputCells.length, 'existing output cells for code cell', cellId);
    console.log('🔧 DEBUG: Saved positions:', savedPositions);
    
    // Remove existing output cells
    if (existingOutputCells.length > 0) {
      const existingOutputIds = new Set(existingOutputCells.map(c => c.id));
      const cellsWithoutOldOutputs = currentDocument.cells.filter(c => !existingOutputIds.has(c.id));
      
      set({
        document: {
          ...currentDocument,
          cells: cellsWithoutOldOutputs,
          modified: new Date().toISOString(),
        },
      });
    }

    try {
      const result = await pythonExecutionService.executeCode(cell.content, cellId, document.id);
      
      // Update the code cell with execution count (but preserve execution order)
      get().updateCell(cellId, {
        executionCount: newExecutionCount,
        // Do NOT update executionOrder - it represents design logic, not execution history
      });

      // Process outputs - handle both text and rich outputs
      const hasTextOutput = result.stdout && result.stdout.trim();
      const hasErrorOutput = result.stderr && result.stderr.trim();
      const hasRichOutputs = result.outputs && Array.isArray(result.outputs) && result.outputs.length > 0;


      // Create output cells with improved position reuse logic
      const currentState = get();
      let newCells = [...currentState.document.cells];
      let outputIndex = 0; // Track which saved position to use
      
      // Helper function to get next available position
      const getOutputPosition = (outputType: string) => {
        // Try to find a saved position that matches the output type
        let savedPos = null;
        for (let i = outputIndex; i < savedPositions.length; i++) {
          if (savedPositions[i].outputType === outputType) {
            savedPos = savedPositions[i];
            outputIndex = i + 1; // Move to next position for subsequent outputs
            break;
          }
        }
        
        // If no matching type found, use the next available position
        if (!savedPos && outputIndex < savedPositions.length) {
          savedPos = savedPositions[outputIndex];
          outputIndex++;
        }
        
        // Return saved position or calculate default
        if (savedPos) {
          console.log('🔧 DEBUG: Reusing saved position for', outputType, 'at', savedPos.position);
          return { position: savedPos.position, size: savedPos.size };
        } else {
          const defaultPos = {
            x: cell.position.x + cell.size.width + 20,
            y: cell.position.y + (outputIndex * 220),
          };
          console.log('🔧 DEBUG: Using default position for', outputType, 'at', defaultPos);
          return { 
            position: defaultPos, 
            size: outputType === 'image' ? { width: 400, height: 300 } : { width: 400, height: 100 }
          };
        }
      };

      // Add text output if present
      if (hasTextOutput || hasErrorOutput) {
        const textOutputContent = hasErrorOutput ? result.stderr : result.stdout;
        const outputType = hasErrorOutput ? 'error' : 'text';
        const { position, size } = getOutputPosition(outputType);
        
        // Adjust size based on content
        const adjustedSize = {
          width: size.width,
          height: Math.max(100, Math.min(300, textOutputContent.split('\n').length * 20 + 40))
        };
        
        const textOutputCell: Cell = {
          id: uuidv4(),
          type: 'raw',
          position,
          size: adjustedSize,
          executionOrder: cell.executionOrder, // Match the source code cell's sequence number
          collapsed: false,
          collapsedSize: { width: 400, height: 50 },
          selected: false,
          zIndex: newCells.length + 10,
          content: textOutputContent,
          format: 'text',
        } as any;
        
        // Mark this as an output cell for this code cell
        (textOutputCell as any).sourceCodeCellId = cellId;
        (textOutputCell as any).outputType = outputType;
        (textOutputCell as any).success = !hasErrorOutput;
        
        newCells.push(textOutputCell);
      }

      // Add rich outputs (images, plots, etc.)
      if (hasRichOutputs && result.outputs) {
        for (const output of result.outputs) {
          if (output.type === 'image') {
            const imageUrl = `http://localhost:3001/api/outputs/${output.data}`;
            const { position, size } = getOutputPosition('image');
            
            // Adjust size based on image metadata
            const adjustedSize = {
              width: Math.min(500, output.metadata?.width || size.width),
              height: Math.min(400, output.metadata?.height || size.height)
            };
            
            const imageOutputCell: Cell = {
              id: uuidv4(),
              type: 'raw',
              position,
              size: adjustedSize,
              executionOrder: cell.executionOrder, // Match the source code cell's sequence number
              collapsed: false,
              collapsedSize: { width: 400, height: 50 },
              selected: false,
              zIndex: newCells.length + 10,
              content: '', // No text content for image cells
              format: 'text',
            } as any;
            
            // Add proper rich outputs structure
            (imageOutputCell as any).outputs = [{
              format: 'image',
              data: imageUrl,
              metadata: output.metadata || {}
            }];
            
            // Mark this as an output cell for this code cell
            (imageOutputCell as any).sourceCodeCellId = cellId;
            (imageOutputCell as any).outputType = 'image';
            (imageOutputCell as any).success = true;
            
            newCells.push(imageOutputCell);
          }
        }
      }

      // If no outputs at all, create a simple success message
      if (!hasTextOutput && !hasErrorOutput && !hasRichOutputs) {
        const { position, size } = getOutputPosition('success');
        
        const successOutputCell: Cell = {
          id: uuidv4(),
          type: 'raw',
          position,
          size: { width: Math.max(300, size.width), height: Math.max(60, size.height) },
          executionOrder: cell.executionOrder, // Match the source code cell's sequence number
          collapsed: false,
          collapsedSize: { width: 300, height: 50 },
          selected: false,
          zIndex: newCells.length + 10,
          content: '✓ Execution completed successfully',
          format: 'text',
        } as any;
        
        (successOutputCell as any).sourceCodeCellId = cellId;
        (successOutputCell as any).outputType = 'success';
        (successOutputCell as any).success = true;
        
        newCells.push(successOutputCell);
      }

      // Update the document with new cells
      set({
        document: {
          ...currentState.document,
          cells: newCells,
          executionHistory: [...currentState.document.executionHistory, Date.now()],
          modified: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('❌ Execution error:', error);
      // Handle execution error
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
      
      // Update the code cell with execution count even on error
      get().updateCell(cellId, {
        executionCount: newExecutionCount,
      });
      
      // Create error output cell
      const updatedDocument = get().document;
      const errorOutputCell: Cell = {
        id: uuidv4(),
        type: 'raw',
        position: {
          x: cell.position.x + cell.size.width + 20,
          y: cell.position.y,
        },
        size: { width: 400, height: 150 },
        executionOrder: null,
        collapsed: false,
        collapsedSize: { width: 400, height: 50 },
        selected: false,
        zIndex: updatedDocument.cells.length,
        content: `❌ Error: ${errorMessage}`,
        format: 'text',
      } as any;

      (errorOutputCell as any).sourceCodeCellId = cellId;
      (errorOutputCell as any).outputType = 'error';
      
      // Set the same execution order as the source code cell
      errorOutputCell.executionOrder = cell.executionOrder;

      set({
        document: {
          ...updatedDocument,
          cells: [...updatedDocument.cells, errorOutputCell],
          modified: new Date().toISOString(),
        },
      });
    } finally {
      set({ isExecuting: false });
    }
  },

  executeCells: (cellIds: string[]) => {
    cellIds.forEach(cellId => get().executeCell(cellId));
  },

  updateExecutionOrder: () => {
    // This function should not automatically assign execution order to all cells
    // Execution order should only be set when code cells are actually executed
    // For now, this is a no-op to prevent incorrect execution order assignment
    console.log('updateExecutionOrder called - execution order is managed by actual cell execution');
  },

  // Drag actions
  startDrag: (cellId: string, offset: Position) => {
    set({
      dragState: {
        isDragging: true,
        draggedCellId: cellId,
        dragOffset: offset,
      },
    });
  },

  updateDrag: (position: Position) => {
    const { dragState } = get();
    if (dragState.isDragging && dragState.draggedCellId) {
      const newPosition = {
        x: position.x - dragState.dragOffset.x,
        y: position.y - dragState.dragOffset.y,
      };
      get().updateCellPosition(dragState.draggedCellId, newPosition);
    }
  },

  endDrag: () => {
    set({
      dragState: {
        isDragging: false,
        draggedCellId: null,
        dragOffset: { x: 0, y: 0 },
      },
    });
    get().updateExecutionOrder();
  },

  // Collapse actions
  toggleCellCollapse: (cellId: string) => {
    const { document } = get();
    const cell = document.cells.find(c => c.id === cellId);
    if (cell) {
      get().updateCell(cellId, { collapsed: !cell.collapsed });
    }
  },

  // Recent files actions
  addRecentFile: async (filePath: string) => {
    // Save to server-based persistent storage
    const success = await saveRecentFileToServer(filePath);
    
    if (success) {
      // Reload recent files from server to get updated list
      const updatedRecentFiles = await loadRecentFilesFromServer();
      set({ recentFiles: updatedRecentFiles });
    }
  },

  getRecentFiles: async () => {
    // Load fresh data from server
    const serverRecentFiles = await loadRecentFilesFromServer();
    const current = get().recentFiles;
    
    // Update store if server has different data
    if (JSON.stringify(serverRecentFiles) !== JSON.stringify(current)) {
      set({ recentFiles: serverRecentFiles });
    }
    
    return serverRecentFiles;
  },

  // Load recent files from server (for initialization)
  loadRecentFiles: async () => {
    const recentFiles = await loadRecentFilesFromServer();
    set({ recentFiles });
    return recentFiles;
  },
};
});

// Register working directory for initial document when store is created
setTimeout(() => {
  const store = useStore.getState();
  store.registerWorkingDirectory(store.document.id, '/Users/lewis/opt/design-diary');
}, 100);
