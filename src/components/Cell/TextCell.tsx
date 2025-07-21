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
    // Handle HTML img tags with relative src - improved regex to handle various formats
    rendered = rendered.replace(
      /<img([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*?)>/gim,
      (match, beforeSrc, src, afterSrc) => {
        console.log('Found img tag:', { match, src, documentId });
        // Check if it's a relative URL (doesn't start with http:// or https:// or /)
        if (!src.match(/^(https?:\/\/|\/|data:)/)) {
          const transformedSrc = `http://localhost:3001/api/notebook-files/${documentId}/${src}`;
          console.log('Transforming image URL:', { original: src, transformed: transformedSrc });
          return `<img${beforeSrc} src="${transformedSrc}"${afterSrc} onerror="console.error('Failed to load image:', this.src); this.style.border='2px solid red'; this.style.padding='10px';">`;
        }
        return match;
      }
    );

    // Handle markdown image syntax ![alt](src)
    rendered = rendered.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gim,
      (match, alt, src) => {
        console.log('Found markdown image:', { match, src, documentId });
        // Check if it's a relative URL
        if (!src.match(/^(https?:\/\/|\/|data:)/)) {
          const transformedSrc = `http://localhost:3001/api/notebook-files/${documentId}/${src}`;
          console.log('Transforming markdown image URL:', { original: src, transformed: transformedSrc });
          return `<img src="${transformedSrc}" alt="${alt}" onerror="console.error('Failed to load image:', this.src); this.style.border='2px solid red'; this.style.padding='10px';">`;
        }
        return `<img src="${src}" alt="${alt}">`;
      }
    );
  } else {
    console.warn('No documentId provided for image URL transformation');
  }

  return rendered;
};

const TextCellContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
`;

const TextEditor = styled.div`
  width: 100%;
  height: 100%;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  overflow: hidden;
`;

const TextArea = styled.textarea<{ fontSize: number; fontFamily: string }>`
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 2px 4px; /* Reduced from 4px 8px to minimize whitespace */
  font-size: ${props => props.fontSize}px;
  font-family: ${props => props.fontFamily};
  resize: none;
  background: transparent;
  
  &::placeholder {
    color: #6c757d;
  }
`;

const FontControls = styled.div`
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 11px;
  align-items: center;
  z-index: 1001;
  backdrop-filter: blur(2px);
`;

const ControlButton = styled.button`
  padding: 2px 4px;
  border: 1px solid #dee2e6;
  border-radius: 2px;
  background: white;
  color: #495057;
  font-size: 10px;
  cursor: pointer;
  
  &:hover {
    background: #f8f9fa;
    color: #007bff;
  }
`;

const RenderedContent = styled.div<{ fontSize: number; fontFamily: string }>`
  width: 100%;
  height: 100%;
  padding: 2px 4px; /* Reduced from 4px 8px to minimize whitespace */
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
  
  img {
    max-width: 100%;
    height: auto;
  }
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
  const renderedContentRef = useRef<HTMLDivElement>(null);
  const { updateCell, document } = useStore();
  const [isEditMode, setIsEditMode] = useState(true);

  // Removed clearSelection call that was interfering with newly created cells

  // Handle image loading with directory handles
  useEffect(() => {
    if (!isEditMode && renderedContentRef.current) {
      const images = renderedContentRef.current.querySelectorAll('img');
      
      images.forEach(async (img) => {
        const originalSrc = img.src;
        
        // Check if this is a notebook file URL that might need directory handle
        if (originalSrc.includes('/api/notebook-files/')) {
          img.onerror = async () => {
            try {
              // Try to fetch the URL to see if it returns a directory handle response
              const response = await fetch(originalSrc);
              
              if (response.ok) {
                const data = await response.json();
                
                if (data.useDirectoryHandle) {
                  console.log('Using directory handle for image:', data.filePath);
                  
                  // Get the directory handle from window storage
                  const directoryHandles = (window as any).notebookDirectoryHandles;
                  if (directoryHandles && directoryHandles.has(data.documentId)) {
                    const directoryHandle = directoryHandles.get(data.documentId);
                    
                    try {
                      // Get the file from the directory
                      const fileHandle = await directoryHandle.getFileHandle(data.filePath);
                      const file = await fileHandle.getFile();
                      
                      // Create a blob URL for the image
                      const blobUrl = URL.createObjectURL(file);
                      img.src = blobUrl;
                      
                      console.log('Successfully loaded image from directory handle:', data.filePath);
                      
                      // Clean up the blob URL when the image is removed
                      img.onload = () => {
                        // Store the blob URL for cleanup later
                        (img as any)._blobUrl = blobUrl;
                      };
                      
                    } catch (fileError) {
                      console.error('Failed to load file from directory handle:', fileError);
                      img.alt = `Failed to load: ${data.filePath}`;
                    }
                  } else {
                    console.warn('No directory handle found for document:', data.documentId);
                    img.alt = `No directory access for: ${data.filePath}`;
                  }
                }
              }
            } catch (error) {
              console.error('Error handling image load failure:', error);
            }
          };
        }
      });
      
      // Cleanup blob URLs when component unmounts or content changes
      return () => {
        images.forEach((img) => {
          const blobUrl = (img as any)._blobUrl;
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        });
      };
    }
  }, [isEditMode, cell.content, document.id]);

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

  // Function to handle "execute" (render) for text cells
  const handleExecute = useCallback(() => {
    setIsEditMode(false);
  }, []);

  // Expose the execute function to the cell for toolbar access
  useEffect(() => {
    if (cell.type === 'markdown') {
      // Store the execute function on the cell for toolbar access
      (cell as any).executeFunction = handleExecute;
    }
  }, [cell, handleExecute]);

  return (
    <TextCellContainer>
      {/* Only show font controls when cell is selected and in edit mode */}
      {cell.selected && isEditMode && (
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
          <ControlButton onClick={() => setIsEditMode(false)}>
            Render
          </ControlButton>
        </FontControls>
      )}
      
      {/* Show edit button when in render mode */}
      {cell.selected && !isEditMode && (
        <FontControls>
          <ControlButton onClick={() => setIsEditMode(true)}>
            Edit
          </ControlButton>
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
            ref={renderedContentRef}
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
