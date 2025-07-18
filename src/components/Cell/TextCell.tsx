import React, { useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { MarkdownCell } from '../../types';
import { useStore } from '../../store/useStore';

const TextCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const TextEditor = styled.div`
  flex: 1;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  overflow: hidden;
`;

const TextArea = styled.textarea<{ fontSize: number; fontFamily: string }>`
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 12px;
  font-size: ${props => props.fontSize}px;
  font-family: ${props => props.fontFamily};
  resize: none;
  background: transparent;
  
  &::placeholder {
    color: #6c757d;
  }
`;

const FontControls = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  padding: 4px;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 12px;
`;

const FontSizeInput = styled.input`
  width: 50px;
  padding: 2px 4px;
  border: 1px solid #dee2e6;
  border-radius: 2px;
  font-size: 11px;
`;

const FontFamilySelect = styled.select`
  padding: 2px 4px;
  border: 1px solid #dee2e6;
  border-radius: 2px;
  font-size: 11px;
  background: white;
`;

interface TextCellProps {
  cell: MarkdownCell;
}

const TextCell: React.FC<TextCellProps> = ({ cell }) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { updateCell } = useStore();

  // Safely access renderingHints with proper defaults
  const renderingHints = cell.renderingHints || {};
  const fontSize = renderingHints.fontSize || 14;
  const fontFamily = renderingHints.fontFamily || 'Arial, sans-serif';

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateCell(cell.id, { content: e.target.value });
  }, [cell.id, updateCell]);

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFontSize = parseInt(e.target.value) || 14;
    const currentHints = cell.renderingHints || {};
    updateCell(cell.id, { 
      renderingHints: { 
        ...currentHints, 
        fontSize: newFontSize 
      } 
    });
  }, [cell.id, cell.renderingHints, updateCell]);

  const handleFontFamilyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const currentHints = cell.renderingHints || {};
    updateCell(cell.id, { 
      renderingHints: { 
        ...currentHints, 
        fontFamily: e.target.value 
      } 
    });
  }, [cell.id, cell.renderingHints, updateCell]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [cell.content]);

  return (
    <TextCellContainer>
      <FontControls>
        <label>
          Size:
          <FontSizeInput
            type="number"
            min="8"
            max="72"
            value={fontSize}
            onChange={handleFontSizeChange}
          />
        </label>
        <label>
          Font:
          <FontFamilySelect
            value={fontFamily}
            onChange={handleFontFamilyChange}
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
          </FontFamilySelect>
        </label>
      </FontControls>
      
      <TextEditor>
        <TextArea
          ref={textAreaRef}
          value={cell.content}
          onChange={handleContentChange}
          placeholder="Enter your text here..."
          fontSize={fontSize}
          fontFamily={fontFamily}
        />
      </TextEditor>
    </TextCellContainer>
  );
};

export default TextCell;
