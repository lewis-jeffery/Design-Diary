import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useStore, PAGE_SIZES } from '../../store/useStore';
import { LayoutOptimizationService } from '../../services/layoutOptimizationService';
import { PDFGenerationService } from '../../services/pdfGenerationService';
import DirectoryBrowser from '../DirectoryBrowser/DirectoryBrowser';
import SaveAsDialog from '../DirectoryBrowser/SaveAsDialog';

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
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [currentWorkingDirectory, setCurrentWorkingDirectory] = useState('/Users/lewis/opt/design-diary');
  
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
    registerWorkingDirectory,
    getCurrentWorkingDirectory,
    toggleSnapToGrid,
    updateCanvasZoom,
    updatePageSize,
    updatePageOrientation,
    setSavedFileInfo,
    addRecentFile,
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

  const handleAddImageCell = useCallback(() => {
    handleAddCell('markdown', 'image');
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
    console.log('Import button clicked - opening directory browser');
    setShowDirectoryBrowser(true);
  }, []);

  const handleFileSelected = useCallback(async (notebookPath: string) => {
    console.log('File selected for import:', notebookPath);
    
    try {
      // Call server to import the notebook
      const response = await fetch('http://localhost:3001/api/import-notebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notebookPath: notebookPath.trim()
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import notebook');
      }
      
      const result = await response.json();
      console.log('Server import result:', result);
      
      const { notebook, layout, documentId, hasLayout, notebookDirectory } = result;
      
      // Validate notebook structure
      if (!notebook.cells || !Array.isArray(notebook.cells)) {
        throw new Error('Invalid notebook format: missing or invalid cells array');
      }
      
      if (hasLayout && layout) {
        console.log('Importing with existing layout...');
        importFromJupyter(notebook, layout);
      } else {
        console.log('Creating default layout...');
        // Create default layout
        const defaultLayout: any = {
          version: '1.0.0',
          notebook_id: documentId,
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
        const layoutConstraints = {
          pageWidth: defaultLayout.canvas.pageSize.width,
          pageHeight: defaultLayout.canvas.pageSize.height,
          margin: defaultLayout.canvas.pageMargin,
          cellSpacing: 20,
          maxPages: 10
        };
        
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
            defaultLayout.cells[cellId] = {
              position: { x: 100, y: 100 + index * 250 },
              size: { width: 400, height: 200 },
              collapsed_size: { width: 400, height: 50 },
              z_index: index,
              cell_type: cell.cell_type,
              rendering_hints: {}
            };
          }
        });
        
        // Calculate pages needed
        const pagesNeeded = Math.max(1, Math.ceil(
          Object.values(defaultLayout.cells).reduce((maxY: number, cell: any) => 
            Math.max(maxY, cell.position.y + cell.size.height), 0
          ) / defaultLayout.canvas.pageSize.height
        ));
        
        defaultLayout.canvas.pages = pagesNeeded;
        
        importFromJupyter(notebook, defaultLayout);
      }
      
      // Register the working directory with the actual document ID after import
      // The document ID might have changed during import, so we need to use the current document ID
      if (notebookDirectory) {
        // Wait a bit for the import to complete, then register with the current document ID
        setTimeout(async () => {
          const currentDocument = useStore.getState().document;
          await registerWorkingDirectory(currentDocument.id, notebookDirectory);
          console.log(`Registered working directory for imported document: ${currentDocument.id} -> ${notebookDirectory}`);
        }, 100);
      }
      
      // Add to recent files on successful import
      await addRecentFile(notebookPath);
      
      console.log('Import completed successfully');
      
    } catch (error) {
      console.error('Error during import:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [importFromJupyter, addRecentFile, registerWorkingDirectory]);

  // Helper function to get directory path from directory handle
  const getDirectoryPath = async (directoryHandle: any): Promise<string | null> => {
    try {
      // This is a workaround since we can't directly get the path from FileSystemDirectoryHandle
      // We'll try to resolve it through the handle's name and parent references
      
      // For now, we'll ask the user to confirm the path since we can't reliably get it
      const confirmedPath = prompt(
        `Directory selected: "${directoryHandle.name}"\n\n` +
        `Please enter the full path to this directory for image loading:\n` +
        `Example: /Users/username/Documents/${directoryHandle.name}\n\n` +
        `Leave empty to skip image loading:`
      );
      
      return confirmedPath?.trim() || null;
    } catch (error) {
      console.error('Error getting directory path:', error);
      return null;
    }
  };

  const handleNewDocument = useCallback(() => {
    const hasContent = designDocument.cells.length > 0;
    
    if (hasContent) {
      const shouldProceed = window.confirm(
        '⚠️ Create New Document?\n\n' +
        'This will permanently delete the current document and all its cells.\n\n' +
        'Click "OK" to create a new document, or "Cancel" to keep working on the current document.'
      );
      
      if (!shouldProceed) {
        return;
      }
    }
    
    createNewDocument();
  }, [designDocument.cells.length, createNewDocument]);

  const handleSaveAs = useCallback(async () => {
    console.log('Save As button clicked - opening save dialog');
    
    // Load the current working directory before opening the dialog
    try {
      const workingDir = await getCurrentWorkingDirectory();
      setCurrentWorkingDirectory(workingDir);
      console.log('Using working directory for save dialog:', workingDir);
    } catch (error) {
      console.warn('Failed to get current working directory, using default:', error);
      setCurrentWorkingDirectory('/Users/lewis/opt/design-diary');
    }
    
    setShowSaveAsDialog(true);
  }, [getCurrentWorkingDirectory]);

  const handleSaveAsSelected = useCallback(async (filePath: string) => {
    console.log('File path selected for save:', filePath);
    
    try {
      const { notebook, layout } = exportToJupyter();
      
      // Call server to save the files
      const response = await fetch('http://localhost:3001/api/save-notebook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notebookPath: filePath,
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
      const fileName = filePath.split('/').pop()?.replace('.ipynb', '') || 'notebook';
      
      // Save the file info for future quick saves
      setSavedFileInfo(fileName, filePath);
      
      alert(`Successfully saved:\n• ${result.notebookPath}\n• ${result.layoutPath}`);
      
    } catch (error) {
      console.error('Save error:', error);
      alert(`Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [exportToJupyter, setSavedFileInfo]);

  const handleExportToPDF = useCallback(async () => {
    if (designDocument.cells.length === 0) {
      alert('No content to export. Please add some cells first.');
      return;
    }

    try {
      // Show loading message
      const loadingMessage = document.createElement('div');
      loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      loadingMessage.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #007bff;">📄 Generating PDF</h3>
        <p style="margin: 0; color: #495057;">Rendering content and creating PDF file...</p>
      `;
      document.body.appendChild(loadingMessage);

      // Define common page sizes in points (72 points = 1 inch)
      const pageSizes = {
        'A4': { width: 595, height: 842, name: 'A4' },
        'A3': { width: 842, height: 1191, name: 'A3' },
        'Letter': { width: 612, height: 792, name: 'Letter' },
        'Legal': { width: 612, height: 1008, name: 'Legal' },
        'Tabloid': { width: 792, height: 1224, name: 'Tabloid' }
      };

      // Get current canvas page size
      const currentPageSize = designDocument.canvas.pageSize;
      
      // Ask user for target PDF page size
      const targetPageName = prompt(
        `Current canvas: ${currentPageSize.name} (${Math.round(currentPageSize.width)}×${Math.round(currentPageSize.height)})\n\n` +
        `Choose target PDF page size:\n` +
        `• A4 (595×842 pts) - Standard document\n` +
        `• A3 (842×1191 pts) - Large format\n` +
        `• Letter (612×792 pts) - US standard\n` +
        `• Legal (612×1008 pts) - US legal\n` +
        `• Tabloid (792×1224 pts) - Large US\n\n` +
        `Enter page size name (A4, A3, Letter, Legal, Tabloid):`,
        'A4'
      );

      if (!targetPageName) {
        document.body.removeChild(loadingMessage);
        return;
      }

      const targetPageSize = pageSizes[targetPageName.toUpperCase() as keyof typeof pageSizes];
      if (!targetPageSize) {
        alert('Invalid page size. Please choose from: A4, A3, Letter, Legal, Tabloid');
        document.body.removeChild(loadingMessage);
        return;
      }

      // Generate PDF with canvas orientation
      const pdfBlob = await PDFGenerationService.generatePDF(designDocument, {
        targetPageSize,
        includeBackground: false, // Clean content-only export
        quality: 2, // High quality
        margin: 20, // 20pt margin
        orientation: designDocument.canvas.orientation // Use canvas orientation
      });

      // Clean up loading message
      document.body.removeChild(loadingMessage);

      // Download PDF
      const fileName = designDocument.name.replace(/\s+/g, '_');
      PDFGenerationService.downloadPDF(pdfBlob, `${fileName}.pdf`);

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #28a745;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      successMessage.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #28a745;">✅ PDF Generated Successfully</h3>
        <p style="margin: 0; color: #495057;">Downloaded as: ${fileName}.pdf</p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #6c757d;">Target size: ${targetPageName.toUpperCase()}</p>
      `;
      document.body.appendChild(successMessage);

      // Auto-hide success message
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);

    } catch (error) {
      console.error('PDF generation error:', error);
      
      // Clean up any loading message
      const loadingMessage = document.querySelector('div[style*="Generating PDF"]');
      if (loadingMessage) {
        document.body.removeChild(loadingMessage);
      }
      
      alert(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [designDocument]);

  const handleQuit = useCallback(async () => {
    // Check if this is a new file (never been saved)
    const isNewFile = !savedFileInfo.baseFileName;
    // Check if there are any cells (content exists)
    const hasContent = designDocument.cells.length > 0;
    // For existing files, we'd need to check if content has changed since last save
    // For now, we'll assume any content means unsaved changes for new files
    const hasUnsavedChanges = isNewFile && hasContent;
    
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm(
        'You have unsaved changes. Would you like to save your work before quitting?\n\n' +
        'Click "OK" to save and quit, or "Cancel" to quit without saving.'
      );
      
      if (shouldSave) {
        try {
          // Auto-save the current document using the new Save As dialog
          setShowSaveAsDialog(true);
          return; // Don't quit yet, let the user save first
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

    // If no unsaved changes, quit silently (no confirmation dialog)
    if (!hasUnsavedChanges) {
      console.log('No unsaved changes detected, quitting silently...');
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
  }, [designDocument.cells.length, savedFileInfo.baseFileName]);

  return (
    <>
      <ToolbarContainer>
        <ToolbarSection>
          <PrimaryButton onClick={handleNewDocument}>
            📄 New
          </PrimaryButton>
        </ToolbarSection>

        <ToolbarSection>
          {/* Save As button - green only for first save of new file */}
          <ToolbarButton 
            onClick={handleSaveAs}
            style={{
              background: !savedFileInfo.baseFileName && designDocument.cells.length > 0 ? '#28a745' : 'white',
              color: !savedFileInfo.baseFileName && designDocument.cells.length > 0 ? 'white' : '#495057',
              borderColor: !savedFileInfo.baseFileName && designDocument.cells.length > 0 ? '#28a745' : '#dee2e6'
            }}
            title={!savedFileInfo.baseFileName ? 'Save new document for the first time' : 'Save document with a new name or location'}
          >
            📓 Save As...
          </ToolbarButton>
          
          {/* Save button - green only when there are unsaved changes and file has been saved before */}
          <ToolbarButton 
            onClick={saveJupyter}
            style={{
              opacity: savedFileInfo.baseFileName ? 1 : 0.5,
              cursor: savedFileInfo.baseFileName ? 'pointer' : 'not-allowed',
              background: savedFileInfo.baseFileName && designDocument.cells.length > 0 ? '#28a745' : 'white',
              color: savedFileInfo.baseFileName && designDocument.cells.length > 0 ? 'white' : '#495057',
              borderColor: savedFileInfo.baseFileName && designDocument.cells.length > 0 ? '#28a745' : '#dee2e6'
            }}
            title={savedFileInfo.baseFileName ? `Quick save as ${savedFileInfo.baseFileName}.ipynb and ${savedFileInfo.baseFileName}.layout.json` : 'Use Save As... first to enable quick save'}
          >
            💾 {savedFileInfo.baseFileName ? `Save (${savedFileInfo.baseFileName})` : 'Save'}
          </ToolbarButton>
          <ToolbarButton onClick={handleImportFromJupyter}>
            📥 Import .ipynb
          </ToolbarButton>
          <ToolbarButton onClick={handleExportToPDF}>
            📄 Export PDF
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

      <DirectoryBrowser
        isOpen={showDirectoryBrowser}
        onClose={() => setShowDirectoryBrowser(false)}
        onSelectFile={handleFileSelected}
        title="Select Jupyter Notebook to Import"
      />

      <SaveAsDialog
        isOpen={showSaveAsDialog}
        onClose={() => setShowSaveAsDialog(false)}
        onSave={handleSaveAsSelected}
        defaultFilename={savedFileInfo.baseFileName ? `${savedFileInfo.baseFileName}.ipynb` : 'notebook.ipynb'}
        defaultDirectory={currentWorkingDirectory}
        title="Save Notebook As..."
      />
    </>
  );
};

export default Toolbar;
