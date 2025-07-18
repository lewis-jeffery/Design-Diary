import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EquationCell as EquationCellType } from '../../types';
import { useStore } from '../../store/useStore';

const EquationCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const LatexInput = styled.textarea`
  width: 100%;
  height: 60px;
  padding: 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  resize: vertical;
  margin-bottom: 8px;
`;

const EquationDisplay = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  background: white;
  padding: 16px;
  font-size: 18px;
  min-height: 80px;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
`;

const ModeButton = styled.button<{ active: boolean }>`
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: ${props => props.active ? '#007bff' : 'white'};
  color: ${props => props.active ? 'white' : '#495057'};
  cursor: pointer;
  font-size: 11px;

  &:hover {
    background: ${props => props.active ? '#0056b3' : '#f8f9fa'};
  }
`;

interface EquationCellProps {
  cell: EquationCellType;
}

const EquationCell: React.FC<EquationCellProps> = ({ cell }) => {
  const { updateCell } = useStore();

  const handleLatexChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentHints = (cell as any).renderingHints || {};
    updateCell(cell.id, { 
      renderingHints: { 
        ...currentHints, 
        latex: e.target.value 
      } 
    });
  }, [cell.id, updateCell]);

  const handleModeToggle = useCallback(() => {
    const currentHints = (cell as any).renderingHints || {};
    const currentDisplayMode = currentHints.displayMode || true;
    updateCell(cell.id, { 
      renderingHints: { 
        ...currentHints, 
        displayMode: !currentDisplayMode 
      } 
    });
  }, [cell.id, updateCell]);

  // Simple LaTeX rendering placeholder (in a real app, you'd use MathJax or KaTeX)
  const renderEquation = (latex: string) => {
    // This is a very basic placeholder - real implementation would use MathJax/KaTeX
    return latex.replace(/\^(\w+)/g, '<sup>$1</sup>')
                .replace(/_(\w+)/g, '<sub>$1</sub>')
                .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  };

  return (
    <EquationCellContainer>
      <LatexInput
        value={(cell as any).renderingHints?.latex || ''}
        onChange={handleLatexChange}
        placeholder="Enter LaTeX equation (e.g., E = mc^2, \\frac{a}{b}, x^2 + y^2 = r^2)"
      />
      
      <ModeToggle>
        <ModeButton
          active={(cell as any).renderingHints?.displayMode || true}
          onClick={handleModeToggle}
        >
          Display Mode
        </ModeButton>
        <ModeButton
          active={!((cell as any).renderingHints?.displayMode || true)}
          onClick={handleModeToggle}
        >
          Inline Mode
        </ModeButton>
      </ModeToggle>
      
      <EquationDisplay>
        <div dangerouslySetInnerHTML={{ __html: renderEquation((cell as any).renderingHints?.latex || '') }} />
      </EquationDisplay>
    </EquationCellContainer>
  );
};

export default EquationCell;
