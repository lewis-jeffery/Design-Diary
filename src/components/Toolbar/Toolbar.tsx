import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useStore, PAGE_SIZES } from '../../store/useStore';

const ToolbarContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
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
    // Add cell at center of current view
    const centerX = window.innerWidth / 2 - designDocument.canvas.pan.x;
    const centerY = window.innerHeight / 2 - designDocument.canvas.pan.y;
    
    addCell(type, {
      x: centerX / designDocument.canvas.zoom,
      y: centerY / designDocument.canvas.zoom,
    }, renderingHint);
  }, [addCell, designDocument.canvas]);

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
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.ipynb,.json';
    input.multiple = true;
    
    input.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      let notebookFile: File | null = null;
      let layoutFile: File | null = null;

      // Identify notebook and layout files
      Array.from(files).forEach(file => {
        if (file.name.endsWith('.ipynb')) {
          notebookFile = file;
        } else if (file.name.includes('.layout.json')) {
          layoutFile = file;
        }
      });

      if (!notebookFile) {
        alert('Please select a .ipynb file');
        return;
      }

      const notebookReader = new FileReader();
      notebookReader.onload = (e) => {
        try {
          const notebook = JSON.parse(e.target?.result as string);
          
          if (layoutFile) {
            // Read layout file if provided
            const layoutReader = new FileReader();
            layoutReader.onload = (e) => {
              try {
                const layout = JSON.parse(e.target?.result as string);
                importFromJupyter(notebook, layout);
              } catch (error) {
                console.error('Error parsing layout file:', error);
                alert('Error parsing layout file');
              }
            };
            layoutReader.readAsText(layoutFile);
          } else {
            // Create default layout if no layout file provided
            const defaultLayout: any = {
              version: '1.0.0',
              notebook_id: notebook.metadata?.design_diary?.id || 'imported-notebook',
              canvas: {
                zoom: 1.0,
                pan: { x: 0, y: 0 },
                gridSize: 20,
                snapToGrid: true,
              },
              cells: {},
              execution_history: []
            };
            
            // Generate default positions for cells
            notebook.cells.forEach((cell: any, index: number) => {
              const cellId = cell.id || `cell-${index}`;
              defaultLayout.cells[cellId] = {
                position: { x: 100, y: 100 + index * 250 },
                size: { width: 400, height: 200 },
                collapsed_size: { width: 400, height: 50 },
                z_index: index
              };
            });
            
            importFromJupyter(notebook, defaultLayout);
          }
        } catch (error) {
          console.error('Error parsing notebook file:', error);
          alert('Error parsing notebook file');
        }
      };
      notebookReader.readAsText(notebookFile);
    };
    
    input.click();
  }, [importFromJupyter]);

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
    </ToolbarContainer>
  );
};

export default Toolbar;
