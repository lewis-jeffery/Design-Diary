import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useStore, PAGE_SIZES } from '../../store/useStore';
import { LayoutOptimizationService } from '../../services/layoutOptimizationService';

const ToolbarContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow-x: auto;
  max-width: calc(100vw - 40px);
  
  /* Ensure the quit button is always visible */
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

const ToolbarSection = styled.div`
  display: flex;
  gap: 4px;
  padding: 0 8px;
  border-right: 1px solid #dee2e6;
  
  &:last-child {
    border-right: none;
  }
`;

const ToolbarButton = styled.button`
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  background: white;
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: #f8f9fa;
    border-color: #007bff;
    color: #007bff;
  }

  &:active {
    background: #e9ecef;
  }
`;

const PrimaryButton = styled(ToolbarButton)`
  background: #007bff;
  color: white;
  border-color: #007bff;
  
  &:hover {
    background: #0056b3;
    border-color: #0056b3;
    color: white;
  }
`;

const DocumentInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 12px;
  font-size: 11px;
  color: #6c757d;
`;

const DocumentName = styled.div`
  font-weight: 500;
  color: #495057;
  margin-bottom: 2px;
`;

const ZoomInfo = styled.div`
  font-size: 11px;
  color: #6c757d;
`;

const QuitButton = styled(ToolbarButton)`
  background: #dc3545;
  color: white;
  border-color: #dc3545;
  
  &:hover {
    background: #c82333;
    border-color: #bd2130;
    color: white;
  }
`;

const Toolbar: React.FC = () => {
  const {
    document: designDocument,
    savedFileInfo,
    addCell,
    createNewDocument,
    saveDocument,
    saveAsJupyter,
    saveJupyter,
    exportToJupyter,
    importFromJupyter,
    toggleSnapToGrid,
    updateCanvasZoom,
    updatePageSize,
    updatePageOrientation,
  } = useStore();

  const handleAddCell = useCallback((type: 'code' | 'markdown' | 'raw', renderingHint?: string) => {
    // Add cell at a visible position on the first page
    // Position it relative to the page, not the viewport
    const pageStartX = 50; // Left margin of the page
    const pageStartY = 50; // Top margin of the page
    
    // Add some offset so cells don't stack exactly on top of each other
    const cellOffset = designDocument.cells.length * 20;
    
    addCell(type, {
      x: pageStartX + 100 + cellOffset,
      y: pageStartY + 100 + cellOffset,
    }, renderingHint);
  }, [addCell, designDocument.canvas, designDocument.cells.length]);

  // Helper functions for creating specialized markdown cells
  const handleAddTextCell = useCallback(() => {
    handleAddCell('markdown', 'text');
  }, [handleAddCell]);

  const handleAddEquationCell = useCallback(() => {
    handleAddCell('markdown', 'equation');
  }, [handleAddCell]);

  const handleAddImageCell = useCallback(() => {
    handleAddCell('markdown', 'image');
  }, [handleAddCell]);

  const handleAddGraphCell = useCallback(() => {
    handleAddCell('markdown', 'graph');
  }, [handleAddCell]);


  const handleZoomIn = useCallback(() => {
    updateCanvasZoom(Math.min(3, designDocument.canvas.zoom * 1.2));
  }, [updateCanvasZoom, designDocument.canvas.zoom]);

  const handleZoomOut = useCallback(() => {
    updateCanvasZoom(Math.max(0.1, designDocument.canvas.zoom / 1.2));
  }, [updateCanvasZoom, designDocument.canvas.zoom]);

  const handleZoomReset = useCallback(() => {
    updateCanvasZoom(1.0);
  }, [updateCanvasZoom]);

  const handleExportToJupyter = useCallback(() => {
    const { notebook, layout } = exportToJupyter();
    const baseFileName = designDocument.name.replace(/\s+/g, '_');
    
    // Download notebook file
    const notebookBlob = new Blob([notebook], { type: 'application/json' });
    const notebookUrl = URL.createObjectURL(notebookBlob);
    const notebookLink = window.document.createElement('a');
    notebookLink.href = notebookUrl;
    notebookLink.download = `${baseFileName}.ipynb`;
    window.document.body.appendChild(notebookLink);
    notebookLink.click();
    window.document.body.removeChild(notebookLink);
    URL.revokeObjectURL(notebookUrl);

    // Automatically download layout file with matching name
    setTimeout(() => {
      const layoutBlob = new Blob([layout], { type: 'application/json' });
      const layoutUrl = URL.createObjectURL(layoutBlob);
      const layoutLink = window.document.createElement('a');
      layoutLink.href = layoutUrl;
      layoutLink.download = `${baseFileName}.layout.json`;
      window.document.body.appendChild(layoutLink);
      layoutLink.click();
      window.document.body.removeChild(layoutLink);
      URL.revokeObjectURL(layoutUrl);
    }, 100); // Small delay to ensure sequential downloads
  }, [exportToJupyter, designDocument.name]);

  const handleImportFromJupyter = useCallback(() => {
    console.log('Import button clicked - creating file input');
    
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.ipynb,.json';
    input.multiple = true;
    
    input.onchange = (event) => {
      console.log('File input changed');
      const files = (event.target as HTMLInputElement).files;
      console.log('Selected files:', files);
      
      if (!files || files.length === 0) {
        console.log('No files selected');
        return;
      }

      let notebookFile: File | null = null;
      let layoutFile: File | null = null;

      // Identify notebook and layout files
      Array.from(files).forEach(file => {
        console.log('Processing file:', file.name);
        if (file.name.endsWith('.ipynb')) {
          notebookFile = file;
          console.log('Found notebook file:', file.name);
        } else if (file.name.includes('.layout.json')) {
          layoutFile = file;
          console.log('Found layout file:', file.name);
        }
      });

      if (!notebookFile) {
        console.error('No .ipynb file found');
        alert('Please select a .ipynb file');
        return;
      }

      // TypeScript assertion: we know notebookFile is not null here
      const selectedNotebookFile = notebookFile as File;
      console.log('Reading notebook file:', selectedNotebookFile.name);
      const notebookReader = new FileReader();
      
      notebookReader.onerror = (error) => {
        console.error('Error reading notebook file:', error);
        alert('Error reading notebook file');
      };
      
      notebookReader.onload = (e) => {
        try {
          console.log('Notebook file loaded, parsing JSON...');
          const notebookContent = e.target?.result as string;
          console.log('Notebook content length:', notebookContent.length);
          
          const notebook = JSON.parse(notebookContent);
          console.log('Notebook parsed successfully:', notebook);
          
          // Validate notebook structure
          if (!notebook.cells || !Array.isArray(notebook.cells)) {
            throw new Error('Invalid notebook format: missing or invalid cells array');
          }
          
          if (layoutFile) {
            console.log('Reading layout file:', layoutFile.name);
            // Read layout file if provided
            const layoutReader = new FileReader();
            
            layoutReader.onerror = (error) => {
              console.error('Error reading layout file:', error);
              alert('Error reading layout file');
            };
            
            layoutReader.onload = (e) => {
              try {
                console.log('Layout file loaded, parsing JSON...');
                const layoutContent = e.target?.result as string;
                const layout = JSON.parse(layoutContent);
                console.log('Layout parsed successfully:', layout);
                
                console.log('Calling importFromJupyter with notebook and layout...');
                importFromJupyter(notebook, layout);
                console.log('Import completed successfully');
              } catch (error) {
                console.error('Error parsing layout file:', error);
                alert(`Error parsing layout file: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            };
            layoutReader.readAsText(layoutFile);
          } else {
            console.log('No layout file provided, creating default layout...');
            // Create default layout if no layout file provided
            const defaultLayout: any = {
              version: '1.0.0',
              notebook_id: notebook.metadata?.design_diary?.id || `imported-notebook-${Date.now()}`,
              canvas: {
                zoom: 1.0,
                pan: { x: 0, y: 0 },
                gridSize: 20,
                snapToGrid: true,
                pageSize: { width: 794, height: 1123, name: 'A4' },
                orientation: 'landscape',
                pages: 1,
                pageMargin: 50,
              },
              cells: {},
              execution_history: []
            };
            
            // Generate optimized layout for cells
            console.log('Generating optimized layout for', notebook.cells.length, 'cells');
            
            const layoutConstraints = {
              pageWidth: defaultLayout.canvas.pageSize.width,
              pageHeight: defaultLayout.canvas.pageSize.height,
              margin: defaultLayout.canvas.pageMargin,
              cellSpacing: 20,
              maxPages: 10 // Allow up to 10 pages for large notebooks
            };
            
            console.log('Layout constraints:', layoutConstraints);
            
            // Use the optimization service to generate intelligent layout
            const optimizedCellLayouts = LayoutOptimizationService.generateOptimizedLayout(
              notebook.cells,
              layoutConstraints
            );
            
            // Update cell IDs to match notebook cells
            notebook.cells.forEach((cell: any, index: number) => {
              const cellId = cell.id || `cell-${index}-${Date.now()}`;
              const optimizedLayout = optimizedCellLayouts[cell.id || `cell-${index}`];
              
              if (optimizedLayout) {
                defaultLayout.cells[cellId] = {
                  ...optimizedLayout,
                  cell_type: cell.cell_type,
                  rendering_hints: {}
                };
              } else {
                // Fallback for any cells not handled by optimization
                defaultLayout.cells[cellId] = {
                  position: { x: 100, y: 100 + index * 250 },
                  size: { width: 400, height: 200 },
                  collapsed_size: { width: 400, height: 50 },
                  z_index: index,
                  cell_type: cell.cell_type,
                  rendering_hints: {}
                };
              }
              
              console.log(`Generated layout for cell ${cellId}:`, defaultLayout.cells[cellId]);
            });
            
            // Calculate and set the number of pages needed
            const pagesNeeded = Math.max(1, Math.ceil(
              Object.values(defaultLayout.cells).reduce((maxY: number, cell: any) => 
                Math.max(maxY, cell.position.y + cell.size.height), 0
              ) / defaultLayout.canvas.pageSize.height
            ));
            
            defaultLayout.canvas.pages = pagesNeeded;
            console.log(`Optimized layout created with ${pagesNeeded} pages for ${notebook.cells.length} cells`);
            
            console.log('Default layout created:', defaultLayout);
            console.log('Calling importFromJupyter with notebook and default layout...');
            importFromJupyter(notebook, defaultLayout);
            console.log('Import completed successfully');
          }
        } catch (error) {
          console.error('Error parsing notebook file:', error);
          alert(`Error parsing notebook file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      notebookReader.readAsText(selectedNotebookFile);
    };
    
    console.log('Triggering file input click...');
    input.click();
  }, [importFromJupyter]);

  const handleQuit = useCallback(async () => {
    const hasUnsavedChanges = designDocument.cells.length > 0 && !savedFileInfo.baseFileName;
    
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Would you like to save your work before quitting?\n\n' +
        'Click "OK" to save and quit, or "Cancel" to quit without saving.'
      );
      
      if (shouldSave) {
        try {
          // Auto-save the current document
          saveAsJupyter();
          // Give a moment for the save to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error('Error saving before quit:', error);
          const forceQuit = window.confirm(
            'Failed to save the document. Do you want to quit anyway?\n\n' +
            'Click "OK" to quit without saving, or "Cancel" to stay.'
          );
          if (!forceQuit) {
            return;
          }
        }
      }
    }

    // Show shutdown message
    const shutdownMessage = document.createElement('div');
    shutdownMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #dc3545;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      text-align: center;
      font-family: Arial, sans-serif;
    `;
    shutdownMessage.innerHTML = `
      <h3 style="margin: 0 0 10px 0; color: #dc3545;">🔄 Shutting Down Design Diary</h3>
      <p style="margin: 0; color: #495057;">Saving files and cleaning up...</p>
    `;
    document.body.appendChild(shutdownMessage);

    try {
      // Call shutdown endpoint to gracefully stop servers
      await fetch('/api/shutdown', { method: 'POST' });
    } catch (error) {
      console.log('Server shutdown initiated');
    }

    // Close the window/tab after a brief delay
    setTimeout(() => {
      window.close();
      // If window.close() doesn't work (some browsers block it), show alternative message
      setTimeout(() => {
        shutdownMessage.innerHTML = `
          <h3 style="margin: 0 0 10px 0; color: #28a745;">✅ Shutdown Complete</h3>
          <p style="margin: 0; color: #495057;">You can now safely close this tab or window.</p>
        `;
      }, 1000);
    }, 2000);
  }, [designDocument.cells.length, savedFileInfo.baseFileName, saveAsJupyter]);

  return (
    <ToolbarContainer>
      <ToolbarSection>
        <PrimaryButton onClick={createNewDocument}>
          📄 New
        </PrimaryButton>
      </ToolbarSection>

      <ToolbarSection>
        <ToolbarButton onClick={saveAsJupyter}>
          📓 Save As...
        </ToolbarButton>
        <ToolbarButton 
          onClick={saveJupyter}
          style={{
            opacity: savedFileInfo.baseFileName ? 1 : 0.5,
            cursor: savedFileInfo.baseFileName ? 'pointer' : 'not-allowed',
            background: savedFileInfo.baseFileName ? '#e8f5e8' : 'white',
            borderColor: savedFileInfo.baseFileName ? '#28a745' : '#dee2e6'
          }}
          title={savedFileInfo.baseFileName ? `Quick save as ${savedFileInfo.baseFileName}.ipynb and ${savedFileInfo.baseFileName}.layout.json` : 'Use Save As... first to enable quick save'}
        >
          💾 {savedFileInfo.baseFileName ? `Save (${savedFileInfo.baseFileName})` : 'Save'}
        </ToolbarButton>
        <ToolbarButton onClick={handleImportFromJupyter}>
          📥 Import .ipynb
        </ToolbarButton>
      </ToolbarSection>

      <ToolbarSection>
        <ToolbarButton onClick={() => handleAddCell('code')}>
          📝 Code
        </ToolbarButton>
        <ToolbarButton onClick={handleAddTextCell}>
          📄 Text
        </ToolbarButton>
        <ToolbarButton onClick={handleAddImageCell}>
          🖼️ Image
        </ToolbarButton>
        <ToolbarButton onClick={handleAddEquationCell}>
          🧮 Equation
        </ToolbarButton>
        <ToolbarButton onClick={handleAddGraphCell}>
          📊 Graph
        </ToolbarButton>
      </ToolbarSection>

      <ToolbarSection>
        <ToolbarButton onClick={handleZoomOut}>
          🔍-
        </ToolbarButton>
        <ToolbarButton onClick={handleZoomReset}>
          {Math.round(designDocument.canvas.zoom * 100)}%
        </ToolbarButton>
        <ToolbarButton onClick={handleZoomIn}>
          🔍+
        </ToolbarButton>
      </ToolbarSection>

      <ToolbarSection>
        <ToolbarButton 
          onClick={toggleSnapToGrid}
          style={{ 
            background: designDocument.canvas.snapToGrid ? '#e3f2fd' : 'white',
            color: designDocument.canvas.snapToGrid ? '#1976d2' : '#495057'
          }}
        >
          📐 Grid
        </ToolbarButton>
      </ToolbarSection>

      <ToolbarSection>
        <select
          value={designDocument.canvas.pageSize.name}
          onChange={(e) => updatePageSize(PAGE_SIZES[e.target.value])}
          style={{
            padding: '6px 8px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '12px',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          {Object.entries(PAGE_SIZES).map(([key, pageSize]) => (
            <option key={key} value={key}>
              {pageSize.name}
            </option>
          ))}
        </select>
        <ToolbarButton 
          onClick={() => updatePageOrientation(designDocument.canvas.orientation === 'portrait' ? 'landscape' : 'portrait')}
          style={{ 
            background: designDocument.canvas.orientation === 'landscape' ? '#fff3cd' : '#e3f2fd',
            color: designDocument.canvas.orientation === 'landscape' ? '#856404' : '#1976d2'
          }}
        >
          {designDocument.canvas.orientation === 'landscape' ? '📄' : '📋'} {designDocument.canvas.orientation}
        </ToolbarButton>
      </ToolbarSection>

      <DocumentInfo>
        <DocumentName>{designDocument.name}</DocumentName>
        <ZoomInfo>{designDocument.cells.length} cells • {designDocument.canvas.pageSize.name} {designDocument.canvas.orientation}</ZoomInfo>
      </DocumentInfo>

      <ToolbarSection>
        <QuitButton onClick={handleQuit}>
          🚪 Quit
        </QuitButton>
      </ToolbarSection>
    </ToolbarContainer>
  );
};

export default Toolbar;
