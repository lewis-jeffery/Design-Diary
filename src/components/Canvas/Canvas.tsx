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

const CanvasContent = styled.div<{ $zoom: number; $panX: number; $panY: number }>`
  position: absolute;
  transform: scale(${props => props.$zoom}) translate(${props => props.$panX}px, ${props => props.$panY}px);
  transform-origin: 0 0;
  width: 100%;
  height: 100%;
  min-width: 2000px;
  min-height: 2000px;
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
  border: 1px solid #dee2e6;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
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
    selectMultipleCells,
    updateDrag,
    endDrag,
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
    if (cells.length === 0) return 1;
    
    const pageDimensions = getPageDimensions();
    const pageHeight = pageDimensions.height;
    const pageMargin = canvas.pageMargin;
    
    let maxY = 0;
    cells.forEach(cell => {
      const cellBottom = cell.position.y + cell.size.height;
      maxY = Math.max(maxY, cellBottom);
    });
    
    // Calculate which page this maxY falls on
    const requiredPages = Math.max(1, Math.ceil((maxY + 100) / (pageHeight + pageMargin)));
    return requiredPages;
  }, [cells, getPageDimensions, canvas.pageMargin]);

  const pageDimensions = getPageDimensions();
  const requiredPages = calculateRequiredPages();

  // Handle mouse wheel for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(3, canvas.zoom * delta));
      updateCanvasZoom(newZoom);
    }
  }, [canvas.zoom, updateCanvasZoom]);

  // Handle mouse down for panning and selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
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
      }
    }
  }, [canvas.pan, canvas.zoom]);

  // Handle mouse move for panning, selection, and dragging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (dragState.isDragging) {
      // Handle cell dragging
      const clientX = (e.clientX - rect.left - canvas.pan.x) / canvas.zoom;
      const clientY = (e.clientY - rect.top - canvas.pan.y) / canvas.zoom;
      updateDrag({ x: clientX, y: clientY });
    } else if (isPanningRef.current) {
      // Handle canvas panning
      const deltaX = e.clientX - lastPanPositionRef.current.x;
      const deltaY = e.clientY - lastPanPositionRef.current.y;
      
      updateCanvasPan({
        x: canvas.pan.x + deltaX,
        y: canvas.pan.y + deltaY,
      });
      
      lastPanPositionRef.current = { x: e.clientX, y: e.clientY };
    } else if (isSelectingRef.current) {
      // Handle selection box (this would update selection state)
      // Implementation for selection box drawing would go here
    }
  }, [canvas.pan, canvas.zoom, dragState.isDragging, updateCanvasPan, updateDrag]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
    
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      // Complete selection logic would go here
    }
    
    if (dragState.isDragging) {
      endDrag();
    }
  }, [dragState.isDragging, endDrag]);

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
      >
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
            {canvas.snapToGrid && (
              <Grid $gridSize={canvas.gridSize} $zoom={canvas.zoom} />
            )}
          </PageContainer>
        ))}
        
        {/* Render all cells */}
        {cells.map((cell) => (
          <React.Fragment key={cell.id}>
            <CellComponent cell={cell} />
            {/* Execution order indicator */}
            <ExecutionOrderIndicator
              $position={cell.position}
              $order={cell.executionOrder}
            >
              {cell.executionOrder}
            </ExecutionOrderIndicator>
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
