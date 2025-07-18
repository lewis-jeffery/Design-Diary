import React, { useCallback } from 'react';
import styled from 'styled-components';
import { ImageCell as ImageCellType } from '../../types';
import { useStore } from '../../store/useStore';

const ImageCellContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const ImageUpload = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
`;

const FileInput = styled.input`
  font-size: 12px;
`;

const ImageDisplay = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed #dee2e6;
  border-radius: 4px;
  overflow: hidden;
`;

const Image = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const PlaceholderText = styled.div`
  color: #6c757d;
  text-align: center;
  font-size: 14px;
`;

interface ImageCellProps {
  cell: ImageCellType;
}

const ImageCell: React.FC<ImageCellProps> = ({ cell }) => {
  const { updateCell } = useStore();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const currentHints = (cell as any).renderingHints || {};
        updateCell(cell.id, { 
          renderingHints: { 
            ...currentHints, 
            src, 
            alt: file.name 
          } 
        });
      };
      reader.readAsDataURL(file);
    }
  }, [cell.id, updateCell]);

  return (
    <ImageCellContainer>
      <ImageUpload>
        <FileInput
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </ImageUpload>
      
      <ImageDisplay>
        {(cell as any).renderingHints?.src ? (
          <Image src={(cell as any).renderingHints.src} alt={(cell as any).renderingHints?.alt || 'Image'} />
        ) : (
          <PlaceholderText>
            Click "Choose File" to upload an image
          </PlaceholderText>
        )}
      </ImageDisplay>
    </ImageCellContainer>
  );
};

export default ImageCell;
