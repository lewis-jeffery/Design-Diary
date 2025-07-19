import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Cell } from '../../types';
import { useStore } from '../../store/useStore';

const ToolbarContainer = styled.div<{ $selected: boolean }>`
  position: absolute;
  top: -32px;
  right: 0;
  display: flex;
  gap: 4px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  opacity: ${props => props.$selected ? 1 : 0};
  transition: opacity 0.2s;
  z-index: 1001;
  pointer-events: ${props => props.$selected ? 'auto' : 'none'};

  .cell-container:hover & {
    opacity: ${props => props.$selected ? 1 : 0.7};
    pointer-events: auto;
  }
`;

const ToolbarButton = styled.button`
  padding: 4px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 2px;
  font-size: 11px;
  color: #495057;
  
  &:hover {
    background: #f8f9fa;
    color: #007bff;
  }

  &:active {
    background: #e9ecef;
  }
`;

const ExecuteButton = styled(ToolbarButton)`
  background: #28a745;
  color: white;
  
  &:hover {
    background: #218838;
  }
`;

const DeleteButton = styled(ToolbarButton)`
  color: #dc3545;
  
  &:hover {
    background: #f8d7da;
    color: #721c24;
  }
`;

interface CellToolbarProps {
  cell: Cell;
}

const CellToolbar: React.FC<CellToolbarProps> = ({ cell }) => {
  const {
    executeCell,
    duplicateCell,
    deleteCell,
    toggleCellCollapse,
    addCell,
  } = useStore();

  const handleExecute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    executeCell(cell.id);
  }, [cell.id, executeCell]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateCell(cell.id);
  }, [cell.id, duplicateCell]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCell(cell.id);
  }, [cell.id, deleteCell]);

  const handleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCellCollapse(cell.id);
  }, [cell.id, toggleCellCollapse]);

  const handleInsertBefore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Insert a new cell before this one (execute before)
    const newPosition = {
      x: cell.position.x - 50,
      y: cell.position.y,
    };
    addCell('code', newPosition);
  }, [cell.position, addCell]);

  const handleInsertAfter = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Insert a new cell after this one (execute after)
    const newPosition = {
      x: cell.position.x + cell.size.width + 50,
      y: cell.position.y,
    };
    addCell('code', newPosition);
  }, [cell.position, cell.size, addCell]);

  return (
    <ToolbarContainer className="cell-toolbar" $selected={cell.selected}>
      {cell.type === 'code' && (
        <ExecuteButton onClick={handleExecute} title="Execute Cell">
          ▶
        </ExecuteButton>
      )}
      
      <ToolbarButton onClick={handleInsertBefore} title="Insert Before (Execute Before)">
        ←+
      </ToolbarButton>
      
      <ToolbarButton onClick={handleInsertAfter} title="Insert After (Execute After)">
        +→
      </ToolbarButton>
      
      <ToolbarButton onClick={handleCollapse} title={cell.collapsed ? "Expand" : "Collapse"}>
        {cell.collapsed ? '⬇' : '⬆'}
      </ToolbarButton>
      
      <ToolbarButton onClick={handleDuplicate} title="Duplicate Cell">
        ⧉
      </ToolbarButton>
      
      <DeleteButton onClick={handleDelete} title="Delete Cell">
        ✕
      </DeleteButton>
    </ToolbarContainer>
  );
};

export default CellToolbar;
