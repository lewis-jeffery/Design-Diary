import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useStore } from '../../store/useStore';

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
  justify-content: between;
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
  text-align: right; /* Right-justify for long pathnames */
  direction: rtl; /* Right-to-left text direction to show end of path */
  
  &:focus {
    direction: ltr; /* Switch to normal direction when editing */
    text-align: left;
  }
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

const ContentContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const RecentFilesSection = styled.div`
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
`;

const SectionHeader = styled.div`
  padding: 8px 20px;
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RecentFilesList = styled.div`
  max-height: 150px;
  overflow-y: auto;
`;

const FileList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
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

const BrowserFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SelectedFile = styled.div`
  font-size: 12px;
  color: #6c757d;
  font-family: monospace;
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

interface DirectoryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
  fileFilter?: (file: FileInfo) => boolean;
  title?: string;
}

const DirectoryBrowser: React.FC<DirectoryBrowserProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  fileFilter = (file) => file.name.endsWith('.ipynb'),
  title = 'Select Jupyter Notebook'
}) => {
  const { getRecentFiles, addRecentFile } = useStore();
  const [currentPath, setCurrentPath] = useState('/Users/lewis');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  
  // Load recent files when component opens
  useEffect(() => {
    if (isOpen) {
      getRecentFiles().then(files => setRecentFiles(files));
    }
  }, [isOpen, getRecentFiles]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    
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
      loadDirectory(currentPath);
    }
  }, [isOpen]);

  const handleFileClick = (file: FileInfo) => {
    if (file.isDirectory) {
      loadDirectory(file.path);
    } else {
      setSelectedFile(file.path);
    }
  };

  const handleGoToPath = () => {
    loadDirectory(currentPath);
  };

  const handleGoUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
  };

  const handleSelect = () => {
    if (selectedFile) {
      onSelectFile(selectedFile);
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredFiles = files.filter(file => file.isDirectory || fileFilter(file));
  const canGoUp = currentPath !== '/';

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
        
        <ContentContainer>
          {recentFiles.length > 0 && (
            <RecentFilesSection>
              <SectionHeader>Recent Files</SectionHeader>
              <RecentFilesList>
                {recentFiles.map((recentFile) => (
                  <FileItem
                    key={recentFile.path}
                    $isSelected={selectedFile === recentFile.path}
                    onClick={() => setSelectedFile(recentFile.path)}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '8px 20px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <FileIcon>📓</FileIcon>
                      <span style={{ fontWeight: '500' }}>{recentFile.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6c757d' }}>
                        {new Date(recentFile.lastOpened).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6c757d', 
                      fontFamily: 'monospace',
                      marginLeft: '28px',
                      marginTop: '2px',
                      wordBreak: 'break-all'
                    }}>
                      {recentFile.path}
                    </div>
                  </FileItem>
                ))}
              </RecentFilesList>
            </RecentFilesSection>
          )}
          
          <div style={{ padding: '8px 0' }}>
            <SectionHeader>Browse Files</SectionHeader>
          </div>
          
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
                No files found
              </FileItem>
            )}
            
            {!loading && !error && filteredFiles.map((file) => (
              <FileItem
                key={file.path}
                $isDirectory={file.isDirectory}
                $isSelected={selectedFile === file.path}
                onClick={() => handleFileClick(file)}
              >
                <FileIcon>
                  {file.isDirectory ? '📁' : file.name.endsWith('.ipynb') ? '📓' : '📄'}
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
        </ContentContainer>
        
        <BrowserFooter>
          <SelectedFile>
            {selectedFile ? `Selected: ${selectedFile.split('/').pop()}` : 'No file selected'}
          </SelectedFile>
          <ButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
            <Button $primary onClick={handleSelect} disabled={!selectedFile}>
              Select
            </Button>
          </ButtonGroup>
        </BrowserFooter>
      </BrowserContainer>
    </BrowserOverlay>
  );
};

export default DirectoryBrowser;
