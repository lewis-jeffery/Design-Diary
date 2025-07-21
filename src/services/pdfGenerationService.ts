import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Cell, PageSize, DesignDiaryDocument } from '../types';

export interface PDFGenerationOptions {
  targetPageSize: PageSize;
  includeBackground?: boolean;
  quality?: number;
  margin?: number;
  orientation?: 'portrait' | 'landscape';
}

export class PDFGenerationService {
  /**
   * Generate PDF from Design Diary document
   */
  static async generatePDF(
    document: DesignDiaryDocument,
    options: PDFGenerationOptions
  ): Promise<Blob> {
    const {
      targetPageSize,
      includeBackground = false,
      quality = 2,
      margin = 10,
      orientation
    } = options;

    // Calculate scaling factor from canvas to target page size
    const canvasSize = document.canvas.pageSize;
    const scaleInfo = this.calculateScaling(canvasSize, targetPageSize);

    // Create a temporary container for rendering
    const renderContainer = await this.createRenderContainer(
      document,
      scaleInfo,
      includeBackground
    );

    try {
      // Generate PDF
      const pdf = await this.renderToPDF(
        renderContainer,
        targetPageSize,
        scaleInfo,
        quality,
        margin,
        orientation
      );

      return pdf;
    } finally {
      // Clean up temporary container
      window.document.body.removeChild(renderContainer);
    }
  }

  /**
   * Calculate scaling factor and determine if aspect ratios match
   */
  private static calculateScaling(canvasSize: PageSize, targetSize: PageSize) {
    // Calculate aspect ratios
    const canvasAspect = canvasSize.width / canvasSize.height;
    const targetAspect = targetSize.width / targetSize.height;
    
    // Check if aspect ratios are similar (within 5% tolerance for ISO standards)
    const aspectRatioMatch = Math.abs(canvasAspect - targetAspect) / targetAspect < 0.05;
    
    let scaleX: number;
    let scaleY: number;
    
    if (aspectRatioMatch) {
      // Same aspect ratio - scale uniformly to fit
      scaleX = targetSize.width / canvasSize.width;
      scaleY = targetSize.height / canvasSize.height;
    } else {
      // Different aspect ratio - scale to maintain aspect ratio (fit within target)
      const scale = Math.min(
        targetSize.width / canvasSize.width,
        targetSize.height / canvasSize.height
      );
      scaleX = scale;
      scaleY = scale;
    }

    return {
      scaleX,
      scaleY,
      aspectRatioMatch,
      canvasSize,
      targetSize,
      scaledWidth: canvasSize.width * scaleX,
      scaledHeight: canvasSize.height * scaleY,
      // Calculate actual content bounds for proper positioning
      contentBounds: {
        width: canvasSize.width * scaleX,
        height: canvasSize.height * scaleY
      }
    };
  }

  /**
   * Create a temporary container with only cell content for rendering
   */
  private static async createRenderContainer(
    document: DesignDiaryDocument,
    scaleInfo: any,
    includeBackground: boolean
  ): Promise<HTMLElement> {
    // Calculate the actual canvas dimensions based on orientation
    const canvasSize = document.canvas.pageSize;
    let containerWidth: number;
    let containerHeight: number;
    
    if (document.canvas.orientation === 'landscape') {
      // For landscape, use the larger dimension as width
      containerWidth = Math.max(canvasSize.width, canvasSize.height);
      containerHeight = Math.min(canvasSize.width, canvasSize.height);
    } else {
      // For portrait, use the smaller dimension as width
      containerWidth = Math.min(canvasSize.width, canvasSize.height);
      containerHeight = Math.max(canvasSize.width, canvasSize.height);
    }
    
    const container = window.document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: ${containerWidth * scaleInfo.scaleX}px;
      height: ${containerHeight * scaleInfo.scaleY}px;
      background: ${includeBackground ? '#f8f9fa' : 'white'};
      overflow: hidden;
      z-index: -1000;
    `;

    // Add page background if canvas has grid
    if (includeBackground && document.canvas.snapToGrid) {
      container.style.backgroundImage = `
        linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
      `;
      container.style.backgroundSize = `${document.canvas.gridSize * scaleInfo.scaleX}px ${document.canvas.gridSize * scaleInfo.scaleY}px`;
    }

    // Filter cells to only include those on the first page
    const pageHeight = containerHeight;
    const firstPageCells = document.cells.filter(cell => {
      // Only include cells that start within the first page bounds
      return cell.position.y < pageHeight;
    });

    console.log(`📄 PDF Generation: Found ${firstPageCells.length} cells on first page (out of ${document.cells.length} total)`);
    console.log(`📄 Canvas dimensions: ${containerWidth}x${containerHeight} (${document.canvas.orientation})`);

    // Render each cell's content only (first page only)
    for (const cell of firstPageCells) {
      const cellElement = await this.createCellContentElement(cell, scaleInfo);
      container.appendChild(cellElement);
    }

    window.document.body.appendChild(container);
    return container;
  }

  /**
   * Create a DOM element with only the cell's content (no borders, controls)
   */
  private static async createCellContentElement(
    cell: Cell,
    scaleInfo: any
  ): Promise<HTMLElement> {
    const cellDiv = window.document.createElement('div');
    
    // Position and size the cell content
    cellDiv.style.cssText = `
      position: absolute;
      left: ${cell.position.x * scaleInfo.scaleX}px;
      top: ${cell.position.y * scaleInfo.scaleY}px;
      width: ${cell.size.width * scaleInfo.scaleX}px;
      height: ${cell.size.height * scaleInfo.scaleY}px;
      overflow: hidden;
      font-family: Arial, sans-serif;
      background: white;
    `;

    // Render content based on cell type
    switch (cell.type) {
      case 'code':
        await this.renderCodeCellContent(cellDiv, cell, scaleInfo);
        break;
      case 'markdown':
        await this.renderMarkdownCellContent(cellDiv, cell, scaleInfo);
        break;
      case 'raw':
        await this.renderRawCellContent(cellDiv, cell, scaleInfo);
        break;
    }

    return cellDiv;
  }

  /**
   * Render code cell content
   */
  private static async renderCodeCellContent(
    container: HTMLElement,
    cell: Cell & { type: 'code' },
    scaleInfo: any
  ) {
    const codeElement = window.document.createElement('pre');
    codeElement.style.cssText = `
      margin: 0;
      padding: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: ${12 * Math.min(scaleInfo.scaleX, scaleInfo.scaleY)}px;
      line-height: 1.4;
      color: #333;
      background: #f8f9fa;
      border-radius: 4px;
      overflow: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      height: 100%;
      box-sizing: border-box;
    `;

    // Add execution count if present
    let content = cell.content;
    if (cell.executionCount) {
      content = `[${cell.executionCount}]: ${content}`;
    }

    codeElement.textContent = content;
    container.appendChild(codeElement);
  }

  /**
   * Render markdown cell content
   */
  private static async renderMarkdownCellContent(
    container: HTMLElement,
    cell: Cell & { type: 'markdown' },
    scaleInfo: any
  ) {
    const contentDiv = window.document.createElement('div');
    contentDiv.style.cssText = `
      padding: 8px;
      font-size: ${14 * Math.min(scaleInfo.scaleX, scaleInfo.scaleY)}px;
      line-height: 1.5;
      color: #333;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
    `;

    // Handle different markdown content types
    const hints = (cell as any).renderingHints;
    
    if (hints?.contentType === 'equation') {
      // Render LaTeX equation
      contentDiv.style.textAlign = 'center';
      contentDiv.style.fontSize = `${16 * Math.min(scaleInfo.scaleX, scaleInfo.scaleY)}px`;
      contentDiv.innerHTML = `<div style="font-family: 'Times New Roman', serif; font-style: italic;">${cell.content}</div>`;
    } else if (hints?.contentType === 'image') {
      // Render image placeholder or actual image
      if (hints.src) {
        const img = window.document.createElement('img');
        img.src = hints.src;
        img.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        `;
        contentDiv.appendChild(img);
      } else {
        contentDiv.innerHTML = `<div style="text-align: center; color: #666; font-style: italic;">Image: ${hints.alt || 'No description'}</div>`;
      }
    } else {
      // Regular text content
      // Simple markdown-like rendering
      let htmlContent = cell.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">$1</code>')
        .replace(/\n/g, '<br>');
      
      contentDiv.innerHTML = htmlContent;
    }

    container.appendChild(contentDiv);
  }

  /**
   * Render raw cell content (including output cells)
   */
  private static async renderRawCellContent(
    container: HTMLElement,
    cell: Cell & { type: 'raw' },
    scaleInfo: any
  ) {
    const contentDiv = window.document.createElement('div');
    contentDiv.style.cssText = `
      padding: 8px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: ${12 * Math.min(scaleInfo.scaleX, scaleInfo.scaleY)}px;
      line-height: 1.4;
      color: #333;
      background: #f8f9fa;
      border-radius: 4px;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;

    // Check if this is an output cell with rich content
    const outputs = (cell as any).outputs;
    if (outputs && Array.isArray(outputs)) {
      for (const output of outputs) {
        if (output.format === 'image') {
          const img = window.document.createElement('img');
          img.src = output.data;
          img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          `;
          contentDiv.appendChild(img);
        }
      }
    } else {
      // Regular text content
      contentDiv.textContent = cell.content;
    }

    container.appendChild(contentDiv);
  }

  /**
   * Render the container to PDF
   */
  private static async renderToPDF(
    container: HTMLElement,
    targetPageSize: PageSize,
    scaleInfo: any,
    quality: number,
    margin: number,
    orientation?: 'portrait' | 'landscape'
  ): Promise<Blob> {
    // Capture the container as canvas
    const canvas = await html2canvas(container, {
      scale: quality,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    });

    // Determine orientation - use provided orientation or infer from page size
    let pdfOrientation: 'portrait' | 'landscape';
    let pdfWidth: number;
    let pdfHeight: number;
    
    if (orientation) {
      // Use the specified orientation
      pdfOrientation = orientation;
      if (orientation === 'landscape') {
        pdfWidth = Math.max(targetPageSize.width, targetPageSize.height);
        pdfHeight = Math.min(targetPageSize.width, targetPageSize.height);
      } else {
        pdfWidth = Math.min(targetPageSize.width, targetPageSize.height);
        pdfHeight = Math.max(targetPageSize.width, targetPageSize.height);
      }
    } else {
      // Infer from page size dimensions
      pdfOrientation = targetPageSize.width > targetPageSize.height ? 'landscape' : 'portrait';
      pdfWidth = targetPageSize.width;
      pdfHeight = targetPageSize.height;
    }

    // Create PDF
    const pdf = new jsPDF({
      orientation: pdfOrientation,
      unit: 'pt',
      format: [pdfWidth, pdfHeight]
    });

    // Calculate image dimensions with margin
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - (margin * 2);
    
    // Calculate the actual content dimensions from the rendered canvas
    const canvasAspect = canvas.width / canvas.height;
    const availableAspect = availableWidth / availableHeight;
    
    let imgWidth: number;
    let imgHeight: number;
    
    // Scale to fit within available space while maintaining aspect ratio
    if (canvasAspect > availableAspect) {
      // Canvas is wider - fit to available width
      imgWidth = availableWidth;
      imgHeight = availableWidth / canvasAspect;
    } else {
      // Canvas is taller - fit to available height
      imgHeight = availableHeight;
      imgWidth = availableHeight * canvasAspect;
    }

    // Position the content - align to top-left with margin instead of centering
    // This ensures content starts from the expected position
    const x = margin;
    const y = margin;
    
    // If the scaled content is smaller than available space, we might want to center it
    // But for now, let's align to top-left to match the canvas layout
    const finalX = margin;
    const finalY = margin;

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', finalX, finalY, imgWidth, imgHeight);

    // Return as blob
    return new Promise((resolve) => {
      const pdfBlob = pdf.output('blob');
      resolve(pdfBlob);
    });
  }

  /**
   * Download PDF file
   */
  static downloadPDF(pdfBlob: Blob, filename: string = 'design-diary.pdf') {
    const url = URL.createObjectURL(pdfBlob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
