import React, { useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';
import { Position } from '../../types';
import CellComponent from '../Cell/CellComponent';

const CanvasContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #f8f9fa;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`;

const CanvasContent = styled.div<{ $zoom: number; $panX: number; $panY: number; $contentHeight: number }>`
  position: absolute;
  transform: scale(${props => props.$zoom}) translate(${props => props.$panX}px, ${props => props.$panY}px);
  transform-origin: 0 0;
  width: 100%;
  height: 100%;
  min-width: 2000px;
  min-height: ${props => Math.max(2000, props.$contentHeight)}px;
`;

const PageContainer = styled.div<{ 
  $pageWidth: number; 
  $pageHeight: number; 
  $pageIndex: number; 
  $pageMargin: number; 
}>`
  position: absolute;
  left: 50px;
  top: ${props => 50 + props.$pageIndex * (props.$pageHeight + props.$pageMargin)}px;
  width: ${props => props.$pageWidth}px;
  height: ${props => props.$pageHeight}px;
  background: white;
  border: 2px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 1;
`;

const PageHeader = styled.div`
  position: absolute;
  top: -30px;
  left: 0;
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
`;

const Grid = styled.div<{ $gridSize: number; $zoom: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  background-image: 
    linear-gradient(to right, #000 1px, transparent 1px),
    linear-gradient(to bottom, #000 1px, transparent 1px);
  background-size: ${props => props.$gridSize * props.$zoom}px ${props => props.$gridSize * props.$zoom}px;
`;

const SelectionBox = styled.div<{ start: Position; end: Position }>`
  position: absolute;
  border: 2px dashed #007bff;
  background: rgba(0, 123, 255, 0.1);
  pointer-events: none;
  left: ${props => Math.min(props.start.x, props.end.x)}px;
  top: ${props => Math.min(props.start.y, props.end.y)}px;
  width: ${props => Math.abs(props.end.x - props.start.x)}px;
  height: ${props => Math.abs(props.end.y - props.start.y)}px;
`;

const ExecutionOrderIndicator = styled.div<{ $position: Position; $order: number }>`
  position: absolute;
  left: ${props => props.$position.x - 15}px;
  top: ${props => props.$position.y - 15}px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  z-index: 1000;
  pointer-events: none;
`;

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPositionRef = useRef<Position>({ x: 0, y: 0 });
  const isSelectingRef = useRef(false);
  const selectionStartRef = useRef<Position>({ x: 0, y: 0 });

  const {
    document,
    selectionState,
    dragState,
    updateCanvasPan,
    updateCanvasZoom,
    clearSelection,
  } = useStore();

  const { canvas, cells } = document;

  // Calculate page dimensions based on orientation
  const getPageDimensions = useCallback(() => {
    const { pageSize, orientation } = canvas;
    if (orientation === 'landscape') {
      return {
        width: Math.max(pageSize.width, pageSize.height),
        height: Math.min(pageSize.width, pageSize.height),
      };
    } else {
      return {
        width: Math.min(pageSize.width, pageSize.height),
        height: Math.max(pageSize.width, pageSize.height),
      };
    }
  }, [canvas.pageSize, canvas.orientation]);

  // Calculate required number of pages based on cell positions
  const calculateRequiredPages = useCallback(() => {
    // Always show at least 3 pages for better visibility
    if (cells.length === 0) return 3;
    
    const pageDimensions = getPageDimensions();
    const pageHeight = pageDimensions.height;
    const pageMargin = canvas.pageMargin;
    
    let maxY = 0;
    cells.forEach(cell => {
      const cellBottom = cell.position.y + cell.size.height;
      maxY = Math.max(maxY, cellBottom);
    });
    
    // Calculate which page this maxY falls on, with minimum of 3 pages
    const calculatedPages = Math.ceil((maxY + 200) / (pageHeight + pageMargin));
    return Math.max(3, calculatedPages);
  }, [cells, getPageDimensions, canvas.pageMargin]);

  const pageDimensions = getPageDimensions();
  const requiredPages = calculateRequiredPages();
  
  // Calculate total content height needed for all pages
  const totalContentHeight = 100 + requiredPages * (pageDimensions.height + canvas.pageMargin);

  // Handle mouse wheel for zooming and panning
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, canvas.zoom * delta));
      updateCanvasZoom(newZoom);
    } else {
      // Pan with regular wheel - much slower and with bounds
      const panSpeed = 15; // Reduced from 50 to 15 for better control
      const deltaX = e.shiftKey ? e.deltaY : e.deltaX; // Horizontal scroll with Shift
      const deltaY = e.shiftKey ? 0 : e.deltaY; // Vertical scroll normally
      
      // Calculate new pan position
      const newPanX = canvas.pan.x - deltaX * panSpeed / canvas.zoom;
      const newPanY = canvas.pan.y - deltaY * panSpeed / canvas.zoom;
      
      // Calculate bounds based on content and pages
      const margin = 200; // Extra margin beyond content
      const minPanX = -pageDimensions.width - margin;
      const maxPanX = margin;
      const minPanY = -totalContentHeight - margin;
      const maxPanY = margin;
      
      // Apply bounds to prevent scrolling too far
      const boundedPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
      const boundedPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
      
      updateCanvasPan({
        x: boundedPanX,
        y: boundedPanY,
      });
    }
  }, [canvas.zoom, canvas.pan, updateCanvasZoom, updateCanvasPan, pageDimensions.width, totalContentHeight]);

  // Handle mouse down for panning and selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only handle if clicking directly on the canvas (not on a cell)
    if (e.target !== e.currentTarget) return;
    
    if (e.button === 0) { // Left mouse button
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom;
      const clientY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom;

      if (e.shiftKey) {
        // Start selection box
        isSelectingRef.current = true;
        selectionStartRef.current = { x: clientX, y: clientY };
      } else {
        // Start panning
        isPanningRef.current = true;
        lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault(); // Prevent default to ensure consistent behavior
      }
    }
  }, [canvas.pan, canvas.zoom]);

  // Handle mouse move for panning and selection (cell dragging is handled by CellComponent)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    try {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Skip canvas operations if a cell is being dragged
      if (dragState.isDragging) {
        return; // Let CellComponent handle its own dragging
      }
      
      if (isPanningRef.current) {
        // Handle canvas panning with bounds
        const deltaX = e.clientX - lastPanPositionRef.current.x;
        const deltaY = e.clientY - lastPanPositionRef.current.y;
        
        // Validate deltas
        if (typeof deltaX === 'number' && typeof deltaY === 'number' && 
            !isNaN(deltaX) && !isNaN(deltaY) && 
            isFinite(deltaX) && isFinite(deltaY)) {
          
          // Calculate new pan position
          const newPanX = canvas.pan.x + deltaX;
          const newPanY = canvas.pan.y + deltaY;
          
          // Calculate bounds based on content and pages
          const margin = 200; // Extra margin beyond content
          const minPanX = -pageDimensions.width - margin;
          const maxPanX = margin;
          const minPanY = -totalContentHeight - margin;
          const maxPanY = margin;
          
          // Apply bounds to prevent panning too far
          const boundedPanX = Math.max(minPanX, Math.min(maxPanX, newPanX));
          const boundedPanY = Math.max(minPanY, Math.min(maxPanY, newPanY));
          
          updateCanvasPan({
            x: boundedPanX,
            y: boundedPanY,
          });
          
          lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
        }
      } else if (isSelectingRef.current) {
        // Handle selection box (this would update selection state)
        // Implementation for selection box drawing would go here
      }
    } catch (error) {
      console.error('Error in canvas mouse move:', error);
      // Reset states on error to prevent stuck states
      isPanningRef.current = false;
      isSelectingRef.current = false;
    }
  }, [canvas.pan, canvas.zoom, dragState.isDragging, updateCanvasPan, pageDimensions.width, totalContentHeight]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
    
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      // Complete selection logic would go here
    }
    
    // Cell drag ending is handled by CellComponent's global mouse up listener
  }, []);

  // Handle canvas click (clear selection if clicking on empty space)
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  }, [clearSelection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  // Add wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  return (
    <CanvasContainer
      ref={canvasRef}
      className="canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      <CanvasContent
        className="canvas-content"
        $zoom={canvas.zoom}
        $panX={canvas.pan.x}
        $panY={canvas.pan.y}
        $contentHeight={totalContentHeight}
      >
        {/* Global grid background */}
        {canvas.snapToGrid && (
          <Grid $gridSize={canvas.gridSize} $zoom={canvas.zoom} />
        )}
        
        {/* Render pages */}
        {Array.from({ length: requiredPages }, (_, index) => (
          <PageContainer
            key={`page-${index}`}
            $pageWidth={pageDimensions.width}
            $pageHeight={pageDimensions.height}
            $pageIndex={index}
            $pageMargin={canvas.pageMargin}
          >
            <PageHeader>
              Page {index + 1} - {canvas.pageSize.name} {canvas.orientation}
            </PageHeader>
          </PageContainer>
        ))}
        
        {/* Render all cells */}
        {cells.map((cell) => (
          <React.Fragment key={cell.id}>
            <CellComponent cell={cell} />
            {/* Execution order indicator - only show if cell has been executed */}
            {cell.executionOrder !== null && (
              <ExecutionOrderIndicator
                $position={cell.position}
                $order={cell.executionOrder}
              >
                {cell.executionOrder}
              </ExecutionOrderIndicator>
            )}
          </React.Fragment>
        ))}
        
        {/* Selection box */}
        {selectionState.selectionBox && (
          <SelectionBox
            start={selectionState.selectionBox.start}
            end={selectionState.selectionBox.end}
          />
        )}
      </CanvasContent>
    </CanvasContainer>
  );
};

export default Canvas;
