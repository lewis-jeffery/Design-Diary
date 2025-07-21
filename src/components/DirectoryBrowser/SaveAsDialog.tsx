import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const BrowserOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
`;

const BrowserContainer = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 600px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
`;

const BrowserHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BrowserTitle = styled.h3`
  margin: 0;
  color: #495057;
  font-size: 16px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6c757d;
  padding: 4px;
  
  &:hover {
    color: #495057;
  }
`;

const PathBar = styled.div`
  padding: 12px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  font-family: monospace;
  font-size: 12px;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PathInput = styled.input`
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
`;

const GoButton = styled.button`
  padding: 4px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background: #0056b3;
  }
`;

const FileList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  min-height: 200px;
`;

const FileItem = styled.div<{ $isDirectory?: boolean; $isSelected?: boolean }>`
  padding: 8px 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  background: ${props => props.$isSelected ? '#e3f2fd' : 'transparent'};
  
  &:hover {
    background: ${props => props.$isSelected ? '#e3f2fd' : '#f8f9fa'};
  }
  
  color: ${props => props.$isDirectory ? '#007bff' : '#495057'};
`;

const FileIcon = styled.span`
  font-size: 16px;
  width: 20px;
  text-align: center;
`;

const FilenameSection = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
`;

const FilenameLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
`;

const FilenameInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const BrowserFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SaveLocation = styled.div`
  font-size: 12px;
  color: #6c757d;
  font-family: monospace;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border: 1px solid ${props => props.$primary ? '#007bff' : '#dee2e6'};
  background: ${props => props.$primary ? '#007bff' : 'white'};
  color: ${props => props.$primary ? 'white' : '#495057'};
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.$primary ? '#0056b3' : '#f8f9fa'};
    border-color: ${props => props.$primary ? '#0056b3' : '#007bff'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

interface SaveAsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filePath: string) => void;
  defaultFilename?: string;
  title?: string;
  defaultDirectory?: string;
}

const SaveAsDialog: React.FC<SaveAsDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultFilename = 'notebook.ipynb',
  title = 'Save Notebook As...',
  defaultDirectory
}) => {
  // Use current working directory or fall back to default
  const initialDirectory = defaultDirectory || '/Users/lewis/opt/design-diary';
  const [currentPath, setCurrentPath] = useState(initialDirectory);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [filename, setFilename] = useState(defaultFilename);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/list-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ directoryPath: path }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle different types of errors with user-friendly messages
        if (response.status === 403) {
          let errorMessage = errorData.error || 'Permission denied: You do not have access to this directory';
          if (errorData.help) {
            errorMessage += '\n\n' + errorData.help;
          }
          if (errorData.resolvedPath && errorData.resolvedPath !== errorData.path) {
            errorMessage += `\n\nNote: This path resolves to: ${errorData.resolvedPath}`;
          }
          throw new Error(errorMessage);
        } else if (response.status === 404) {
          throw new Error('Directory not found');
        } else if (response.status === 400 && errorData.code === 'ENOTDIR') {
          throw new Error('This path is not a directory');
        } else {
          throw new Error(errorData.error || 'Failed to load directory');
        }
      }
      
      const result = await response.json();
      setFiles(result.files);
      setCurrentPath(result.directoryPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Update current path if defaultDirectory has changed
      const targetDirectory = defaultDirectory || '/Users/lewis/opt/design-diary';
      setCurrentPath(targetDirectory);
      loadDirectory(targetDirectory);
      setFilename(defaultFilename);
    }
  }, [isOpen, defaultFilename, defaultDirectory]);

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      loadDirectory(file.path);
    } else if (file.name.endsWith('.ipynb')) {
      // If clicking on an existing notebook, use its name as the filename
      setFilename(file.name);
    }
  };

  const handleGoToPath = () => {
    loadDirectory(currentPath);
  };

  const handleGoUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
  };

  const handleSave = () => {
    if (!filename.trim()) {
      alert('Please enter a filename');
      return;
    }

    let finalFilename = filename.trim();
    
    // Ensure the filename ends with .ipynb
    if (!finalFilename.endsWith('.ipynb')) {
      finalFilename += '.ipynb';
    }

    // Construct the full path
    const fullPath = `${currentPath}/${finalFilename}`.replace(/\/+/g, '/');
    
    // Check if file already exists
    const existingFile = files.find(f => f.name === finalFilename);
    if (existingFile) {
      const shouldOverwrite = window.confirm(
        `File "${finalFilename}" already exists.\n\nDo you want to overwrite it?`
      );
      if (!shouldOverwrite) {
        return;
      }
    }

    onSave(fullPath);
    onClose();
  };

  const handleFilenameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const canGoUp = currentPath !== '/';
  const fullSavePath = `${currentPath}/${filename}`.replace(/\/+/g, '/');

  // Filter to show directories and .ipynb files
  const filteredFiles = files.filter(file => 
    file.isDirectory || file.name.endsWith('.ipynb')
  );

  return (
    <BrowserOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <BrowserContainer>
        <BrowserHeader>
          <BrowserTitle>{title}</BrowserTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </BrowserHeader>
        
        <PathBar>
          <PathInput
            value={currentPath}
            onChange={(e) => setCurrentPath(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGoToPath()}
            onFocus={(e) => e.target.select()}
          />
          <GoButton onClick={handleGoToPath}>Go</GoButton>
          {canGoUp && (
            <GoButton onClick={handleGoUp}>↑ Up</GoButton>
          )}
        </PathBar>
        
        <FileList>
          {loading && (
            <FileItem>
              <FileIcon>⏳</FileIcon>
              Loading...
            </FileItem>
          )}
          
          {error && (
            <FileItem>
              <FileIcon>❌</FileIcon>
              Error: {error}
            </FileItem>
          )}
          
          {!loading && !error && filteredFiles.length === 0 && (
            <FileItem>
              <FileIcon>📁</FileIcon>
              No directories or notebooks found
            </FileItem>
          )}
          
          {!loading && !error && filteredFiles.map((file) => (
            <FileItem
              key={file.path}
              $isDirectory={file.isDirectory}
              onClick={() => handleFileClick(file)}
            >
              <FileIcon>
                {file.isDirectory ? '📁' : '📓'}
              </FileIcon>
              {file.name}
              {!file.isDirectory && (
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6c757d' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
            </FileItem>
          ))}
        </FileList>
        
        <FilenameSection>
          <FilenameLabel>Filename:</FilenameLabel>
          <FilenameInput
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyPress={handleFilenameKeyPress}
            placeholder="Enter filename (e.g., my-notebook.ipynb)"
            autoFocus
          />
        </FilenameSection>
        
        <BrowserFooter>
          <SaveLocation title={fullSavePath}>
            Save to: {fullSavePath}
          </SaveLocation>
          <ButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
            <Button 
              $primary 
              onClick={handleSave} 
              disabled={!filename.trim()}
            >
              Save
            </Button>
          </ButtonGroup>
        </BrowserFooter>
      </BrowserContainer>
    </BrowserOverlay>
  );
};

export default SaveAsDialog;
