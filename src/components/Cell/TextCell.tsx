import React, { useCallback, useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { MarkdownCell } from '../../types';
import { useStore } from '../../store/useStore';

// Simple markdown renderer with image URL transformation
const renderMarkdown = (text: string, documentId?: string): string => {
  let rendered = text
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/__(.*?)__/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/_(.*?)_/gim, '<em>$1</em>')
    // Code
    .replace(/`(.*?)`/gim, '<code>$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
    // Line breaks
    .replace(/\n/gim, '<br>')
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

  // Transform relative image URLs to use notebook files endpoint
  if (documentId) {
    // Handle HTML img tags with relative src
    rendered = rendered.replace(
      /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gim,
      (match, beforeSrc, src, afterSrc) => {
        // Check if it's a relative URL (doesn't start with http:// or https:// or /)
        if (!src.match(/^(https?:\/\/|\/)/)) {
          const transformedSrc = `/api/notebook-files/${documentId}/${src}`;
          return `<img${beforeSrc} src="${transformedSrc}"${afterSrc}>`;
        }
        return match;
      }
    );

    // Handle markdown image syntax ![alt](src)
    rendered = rendered.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      (match, alt, src) => {
        // Check if it's a relative URL
        if (!src.match(/^(https?:\/\/|\/)/)) {
          const transformedSrc = `/api/notebook-files/${documentId}/${src}`;
          return `<img src="${transformedSrc}" alt="${alt}">`;
        }
        return `<img src="${src}" alt="${alt}">`;
      }
    );
  }

  return rendered;
};

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
  align-items: center;
`;

const ModeToggle = styled.button<{ $isActive: boolean }>`
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background: ${props => props.$isActive ? '#007bff' : 'white'};
  color: ${props => props.$isActive ? 'white' : '#495057'};
  font-size: 11px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$isActive ? '#0056b3' : '#f8f9fa'};
  }
`;

const RenderedContent = styled.div<{ fontSize: number; fontFamily: string }>`
  width: 100%;
  height: 100%;
  padding: 12px;
  font-size: ${props => props.fontSize}px;
  font-family: ${props => props.fontFamily};
  overflow: auto;
  background: white;
  
  h1, h2, h3 { margin: 0.5em 0; }
  p { margin: 0.5em 0; }
  code { 
    background: #f8f9fa; 
    padding: 2px 4px; 
    border-radius: 3px; 
    font-family: 'Courier New', monospace;
  }
  blockquote {
    border-left: 4px solid #007bff;
    margin: 0.5em 0;
    padding-left: 1em;
    color: #6c757d;
  }
  li { margin: 0.25em 0; }
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
  const { updateCell, clearSelection, document } = useStore();
  const [isEditMode, setIsEditMode] = useState(true);

  // Clear selection when text cell mounts to prevent auto-selection
  useEffect(() => {
    const timer = setTimeout(() => {
      clearSelection();
    }, 50);
    return () => clearTimeout(timer);
  }, [clearSelection]);

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
      {/* Only show controls when cell is selected */}
      {cell.selected && (
        <FontControls>
          <ModeToggle 
            $isActive={isEditMode} 
            onClick={() => setIsEditMode(true)}
          >
            Edit
          </ModeToggle>
          <ModeToggle 
            $isActive={!isEditMode} 
            onClick={() => setIsEditMode(false)}
          >
            Render
          </ModeToggle>
          
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
      )}
      
      <TextEditor>
        {isEditMode ? (
          <TextArea
            ref={textAreaRef}
            value={cell.content}
            onChange={handleContentChange}
            placeholder="Enter your markdown text here..."
            fontSize={fontSize}
            fontFamily={fontFamily}
          />
        ) : (
          <RenderedContent
            fontSize={fontSize}
            fontFamily={fontFamily}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cell.content || '', document.id) }}
          />
        )}
      </TextEditor>
    </TextCellContainer>
  );
};

export default TextCell;
