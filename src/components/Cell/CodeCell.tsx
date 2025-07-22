import React, { useCallback } from 'react';
import styled from 'styled-components';
import Editor from '@monaco-editor/react';
import { CodeCell as CodeCellType } from '../../types';
import { useStore } from '../../store/useStore';

const CodeCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CodeEditor = styled.div<{ $collapsed: boolean }>`
  flex: 1;
  min-height: ${props => props.$collapsed ? '0' : '100px'};
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  overflow: hidden;
`;

const CollapsedPreview = styled.div`
  padding: 4px; /* Reduced from 8px to minimize whitespace */
  background: #f8f9fa;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #6c757d;
  white-space: pre-wrap;
  max-height: 40px;
  overflow: hidden;
`;



const CodeCellWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
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
  min-width: 24px;
  text-align: center;
`;

interface CodeCellProps {
  cell: CodeCellType;
}

const CodeCell: React.FC<CodeCellProps> = ({ cell }) => {
  const { updateCell } = useStore();

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      // Extract first comment lines for collapsed view
      const lines = value.split('\n');
      const commentLines = lines
        .filter(line => line.trim().startsWith('#'))
        .slice(0, 3);

      updateCell(cell.id, {
        content: value,
        firstCommentLines: commentLines,
      });
    }
  }, [cell.id, updateCell]);

  if (cell.collapsed) {
    return (
      <CodeCellContainer>
        <CollapsedPreview>
          {cell.firstCommentLines.length > 0 
            ? cell.firstCommentLines.join('\n')
            : '# Code cell (collapsed)'
          }
        </CollapsedPreview>
      </CodeCellContainer>
    );
  }

  return (
    <CodeCellWrapper>
      {cell.executionOrder !== undefined && cell.executionOrder !== null && (
        <ExecutionNumber>
          [{cell.executionOrder}]
        </ExecutionNumber>
      )}
      
      <CodeCellContainer>
        <CodeEditor $collapsed={cell.collapsed}>
          <Editor
            height="100%"
            language={cell.language}
            value={cell.content}
            onChange={handleCodeChange}
            theme="vs-light"
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
              selectOnLineNumbers: false,
              readOnly: false,
              domReadOnly: false,
              contextmenu: false,
            }}
            loading={
              <textarea
                style={{
                  width: '100%',
                  height: '100%',
                  border: '1px solid #ccc',
                  padding: '8px',
                  fontFamily: 'Monaco, monospace',
                  fontSize: '12px',
                  resize: 'none',
                  backgroundColor: '#f8f9fa'
                }}
                value={cell.content}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Loading Monaco Editor..."
                readOnly
              />
            }
            onMount={(editor, monaco) => {
              console.log('✅ Monaco Editor mounted successfully');
              // Just blur the editor to prevent focus-based issues, but don't clear selection
              setTimeout(() => {
                editor.getContainerDomNode().blur();
              }, 50);
            }}
          />
        </CodeEditor>
      </CodeCellContainer>
    </CodeCellWrapper>
  );
};

export default CodeCell;
