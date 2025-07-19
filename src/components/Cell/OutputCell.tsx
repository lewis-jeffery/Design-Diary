import React, { useState } from 'react';
import styled from 'styled-components';
import { OutputCell as OutputCellType, RichOutput } from '../../types';

const OutputCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const OutputArea = styled.div<{ $success?: boolean; $scrollable?: boolean }>`
  flex: 1;
  padding: 12px;
  background: ${props => 
    props.$success === false ? '#fff5f5' : 
    props.$success === true ? '#f0fff4' : '#f8f9fa'};
  border: 1px solid ${props => 
    props.$success === false ? '#fed7d7' : 
    props.$success === true ? '#c6f6d5' : '#e1e5e9'};
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  overflow-y: ${props => props.$scrollable ? 'auto' : 'visible'};
  line-height: 1.4;
  min-height: 0; /* Allow flex item to shrink */
`;

const OutputHeader = styled.div<{ $success?: boolean }>`
  padding: 6px 12px;
  background: ${props => 
    props.$success === false ? '#fed7d7' : 
    props.$success === true ? '#c6f6d5' : '#e1e5e9'};
  border-radius: 6px 6px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: ${props => 
    props.$success === false ? '#c53030' : 
    props.$success === true ? '#2f855a' : '#4a5568'};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ExecutionNumber = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  color: #495057;
  z-index: 15;
`;

const OutputWrapper = styled.div`
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const RichOutputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ImageOutput = styled.img`
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TextOutput = styled.div`
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  line-height: 1.4;
`;

const ScrollControls = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const ScrollToggle = styled.button<{ $active: boolean }>`
  padding: 2px 6px;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background: ${props => props.$active ? '#007bff' : 'white'};
  color: ${props => props.$active ? 'white' : '#495057'};
  font-size: 10px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$active ? '#0056b3' : '#f8f9fa'};
  }
`;

interface OutputCellProps {
  cell: OutputCellType;
}

const OutputCell: React.FC<OutputCellProps> = ({ cell }) => {
  const [isScrollable, setIsScrollable] = useState(false);

  const getStatusText = () => {
    if (cell.success === true) return '✅ Success';
    if (cell.success === false) return '❌ Error';
    return '📄 Output';
  };

  const getExecutionTime = () => {
    if (cell.executionTime) {
      const time = new Date(cell.executionTime);
      return time.toLocaleTimeString();
    }
    return '';
  };

  const renderRichOutput = (output: RichOutput, index: number) => {
    switch (output.format) {
      case 'image':
        return (
          <ImageOutput
            key={index}
            src={output.data}
            alt={`Output ${index + 1}`}
            onError={(e) => {
              console.error('Failed to load image:', output.data);
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      case 'text':
      case 'html':
      default:
        return (
          <TextOutput key={index}>
            {output.data}
          </TextOutput>
        );
    }
  };

  const hasRichOutputs = cell.outputs && cell.outputs.length > 0;

  return (
    <OutputCellContainer>
      {cell.executionCount && (
        <ExecutionNumber>
          Out [{cell.executionCount}]
        </ExecutionNumber>
      )}
      <OutputWrapper>
        <OutputHeader $success={cell.success}>
          <span>{getStatusText()}</span>
          <ScrollControls>
            <ScrollToggle 
              $active={!isScrollable} 
              onClick={() => setIsScrollable(false)}
              title="Show full output"
            >
              Full
            </ScrollToggle>
            <ScrollToggle 
              $active={isScrollable} 
              onClick={() => setIsScrollable(true)}
              title="Scroll output (max 300px)"
            >
              Scroll
            </ScrollToggle>
            {getExecutionTime() && <span>{getExecutionTime()}</span>}
          </ScrollControls>
        </OutputHeader>
        <OutputArea $success={cell.success} $scrollable={isScrollable}>
          {hasRichOutputs ? (
            <RichOutputContainer>
              {cell.outputs!.map((output, index) => renderRichOutput(output, index))}
              {cell.content && (
                <TextOutput>
                  {cell.content}
                </TextOutput>
              )}
            </RichOutputContainer>
          ) : (
            cell.content || 'No output'
          )}
        </OutputArea>
      </OutputWrapper>
    </OutputCellContainer>
  );
};

export default OutputCell;
