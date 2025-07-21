import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { Cell, Position } from '../../types';
import { useStore } from '../../store/useStore';
import CodeCell from './CodeCell';
import TextCell from './TextCell';
import ImageCell from './ImageCell';
import OutputCell from './OutputCell';
import CellToolbar from './CellToolbar';

const CellContainer = styled.div<{
  $position: Position;
  $size: { width: number; height: number };
  $selected: boolean;
  $collapsed: boolean;
  $zIndex: number;
}>`
  position: absolute;
  left: ${props => props.$position.x}px;
  top: ${props => props.$position.y}px;
  width: ${props => props.$size.width}px;
  height: ${props => props.$size.height}px;
  border: 2px solid ${props => props.$selected ? '#007bff' : '#e1e5e9'};
  border-radius: 8px;
  background: white;
  box-shadow: ${props => props.$selected ? '0 2px 8px rgba(0, 123, 255, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.1)'};
  z-index: ${props => props.$zIndex};
  cursor: move;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  
  /* Show hover effects for all cells */
  &:hover {
    border-color: ${props => props.$selected ? '#007bff' : '#007bff'};
    box-shadow: ${props => props.$selected ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 2px 6px rgba(0, 0, 0, 0.1)'};
  }

  ${props => props.$collapsed && `
    height: ${props.$size.height}px;
    overflow: hidden;
  `}
`;

const CellContent = styled.div<{ $collapsed: boolean; $isOutputCell: boolean }>`
  width: 100%;
  height: ${props => props.$collapsed ? 'auto' : 'calc(100% - 40px)'}; /* Account for toolbar */
  padding: 4px 8px; /* Reduced top/bottom padding to 4px, keep side padding at 8px */
  overflow: ${props => 
    props.$collapsed ? 'hidden' : 
    props.$isOutputCell ? 'visible' : 'auto'
  };
  
  /* For output cells, adjust dimensions to account for consistent padding */
  ${props => props.$isOutputCell && `
    width: calc(100% - 16px); /* Account for 8px padding on each side */
    height: calc(100% - 48px); /* Account for toolbar + 4px padding top/bottom */
  `}
`;

const ResizeHandle = styled.div<{ $selected: boolean }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #007bff;
  cursor: se-resize;
  opacity: ${props => props.$selected ? 0.7 : 0};
  transition: opacity 0.2s;

  /* Only show on hover when selected */
  ${CellContainer}:hover & {
    opacity: ${props => props.$selected ? 1 : 0};
  }

  &:hover {
    opacity: ${props => props.$selected ? 1 : 0} !important;
  }
`;

const DragHandle = styled.div<{ $selected: boolean }>`
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  background: #007bff;
  border-radius: 6px;
  cursor: move;
  opacity: ${props => props.$selected ? 0.9 : 0};
  transition: opacity 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  z-index: 20;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  /* Only show on hover when selected */
  ${CellContainer}:hover & {
    opacity: ${props => props.$selected ? 1 : 0};
  }

  &:hover {
    opacity: ${props => props.$selected ? 1 : 0} !important;
    transform: ${props => props.$selected ? 'scale(1.1)' : 'none'};
  }

  &::before {
    content: "⋮⋮";
    font-weight: bold;
    line-height: 1;
    letter-spacing: -1px;
  }
`;

interface CellComponentProps {
  cell: Cell;
}

const CellComponent: React.FC<CellComponentProps> = ({ cell }) => {
  
  const cellRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);

  const {
    selectCell,
    startDrag,
    updateCellPosition,
    updateCellSize,
    toggleCellCollapse,
  } = useStore();

  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Select the cell
    selectCell(cell.id, e.ctrlKey || e.metaKey);
    
    // Start dragging from the drag handle
    startDrag(cell.id, { x: 10, y: 10 }); // Center of drag handle
    isDraggingRef.current = true;
    
    // Add global mouse event listeners for dragging
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      
      try {
        // Use a simpler, more reliable approach for drag positioning
        const canvasContainer = document.querySelector('.canvas-container') as HTMLElement;
        
        if (!canvasContainer) {
          // Fallback to simple positioning if canvas container not found
          updateCellPosition(cell.id, { 
            x: Math.max(0, e.clientX - 10), 
            y: Math.max(0, e.clientY - 10) 
          });
          return;
        }
        
        const canvasRect = canvasContainer.getBoundingClientRect();
        
        // Get canvas transform values safely
        let zoom = 1;
        let panX = 0;
        let panY = 0;
        
        try {
          // Try to get zoom and pan from the store instead of parsing CSS transforms
          const canvasContent = document.querySelector('.canvas-content') as HTMLElement;
          if (canvasContent) {
            const computedStyle = window.getComputedStyle(canvasContent);
            const transform = computedStyle.transform;
            
            if (transform && transform !== 'none') {
              // More robust transform parsing
              const matrixRegex = /matrix\(([^)]+)\)/;
              const matrixMatch = transform.match(matrixRegex);
              
              if (matrixMatch && matrixMatch[1]) {
                const values = matrixMatch[1].split(',').map(v => {
                  const trimmed = v.trim();
                  const parsed = parseFloat(trimmed);
                  return !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
                });
                
                if (values.length >= 6) {
                  const scaleX = values[0];
                  const translateX = values[4];
                  const translateY = values[5];
                  
                  // Validate values before using them
                  if (scaleX > 0 && scaleX <= 10) { // Reasonable zoom range
                    zoom = scaleX;
                  }
                  if (isFinite(translateX) && Math.abs(translateX) < 10000) { // Reasonable pan range
                    panX = translateX;
                  }
                  if (isFinite(translateY) && Math.abs(translateY) < 10000) { // Reasonable pan range
                    panY = translateY;
                  }
                }
              }
            }
          }
        } catch (transformError) {
          console.warn('Transform parsing failed, using defaults:', transformError);
          // Continue with default values (zoom=1, pan=0)
        }
        
        // Calculate position accounting for zoom and pan with bounds checking
        const rawX = e.clientX - canvasRect.left - panX;
        const rawY = e.clientY - canvasRect.top - panY;
        
        // Ensure zoom is valid before division
        const safeZoom = zoom > 0 ? zoom : 1;
        const x = rawX / safeZoom;
        const y = rawY / safeZoom;
        
        // Update position through store with bounds checking
        const newX = Math.max(0, Math.min(10000, x - 10)); // Reasonable bounds
        const newY = Math.max(0, Math.min(10000, y - 10)); // Reasonable bounds
        
        updateCellPosition(cell.id, { x: newX, y: newY });
        
      } catch (error) {
        console.error('Error in drag handling:', error);
        // Prevent further errors by stopping drag
        isDraggingRef.current = false;
        
        // Clean up event listeners on error
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      }
    };
    
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [cell.id, selectCell, startDrag, updateCellPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Only select the cell if not clicking on drag handle and if it's a real user interaction
    // Also check that the event is not from a programmatic trigger
    if (!(e.target as HTMLElement).closest('.drag-handle') && 
        e.isTrusted && 
        e.detail > 0) { // e.detail > 0 ensures it's a real click, not programmatic
      selectCell(cell.id, e.ctrlKey || e.metaKey);
    }
  }, [cell.id, selectCell]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isResizingRef.current = true;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = cell.size.width;
    const startHeight = cell.size.height;

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRef.current) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const newWidth = Math.max(200, startWidth + deltaX);
        const newHeight = Math.max(100, startHeight + deltaY);
        
        updateCellSize(cell.id, { width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [cell.id, cell.size, updateCellSize]);

  const handleCellWheel = useCallback((e: React.WheelEvent) => {
    // For output cells, prevent canvas scrolling
    if (cell.type === 'raw') {
      e.stopPropagation();
    }
  }, [cell.type]);

  const renderCellContent = () => {
    try {
      switch (cell.type) {
        case 'code':
          return <CodeCell cell={cell} />;
        case 'markdown':
          // Simplified markdown cell handling - check if it's an image cell
          const markdownCell = cell as any;
          const hints = markdownCell.renderingHints || {};
          
          if (hints.src) {
            // This is an image cell
            return <ImageCell cell={markdownCell} />;
          } else {
            // This is a text/markdown cell (handles LaTeX equations automatically)
            return <TextCell cell={markdownCell} />;
          }
        case 'raw':
          return <OutputCell cell={cell as any} selected={cell.selected} />;
        default:
          return <div>Unknown cell type: {(cell as any).type}</div>;
      }
    } catch (error) {
      console.error('Error rendering cell content:', error);
      return <div>Error rendering cell</div>;
    }
  };

  const currentSize = cell.collapsed ? cell.collapsedSize : cell.size;

  return (
    <CellContainer
      ref={cellRef}
      className="cell-container"
      $position={cell.position}
      $size={currentSize}
      $selected={cell.selected}
      $collapsed={cell.collapsed}
      $zIndex={cell.zIndex}
      onMouseDown={handleMouseDown}
      onWheel={handleCellWheel}
    >
      <DragHandle 
        className="drag-handle"
        $selected={cell.selected}
        onMouseDown={handleDragMouseDown}
      />
      
      <CellToolbar cell={cell} />
      
      <CellContent $collapsed={cell.collapsed} $isOutputCell={cell.type === 'raw'}>
        {renderCellContent()}
      </CellContent>
      
      {!cell.collapsed && (
        <ResizeHandle 
          $selected={cell.selected}
          onMouseDown={handleResizeMouseDown} 
        />
      )}
    </CellContainer>
  );
};

export default CellComponent;
