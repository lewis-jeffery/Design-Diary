import jsPDF from 'jspdf';
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
   * Generate PDF from Design Diary document - Simple, reliable text-only approach
   */
  static async generatePDF(
    document: DesignDiaryDocument,
    options: PDFGenerationOptions
  ): Promise<Blob> {
    const {
      targetPageSize,
      margin = 20,
      orientation
    } = options;

    console.log('📄 Starting simple PDF generation...');
    console.log('📄 Document cells:', document.cells.length);
    console.log('📄 Target page size:', targetPageSize);

    try {
      // Determine orientation
      let pdfOrientation: 'portrait' | 'landscape';
      let pdfWidth: number;
      let pdfHeight: number;
      
      if (orientation) {
        pdfOrientation = orientation;
        if (orientation === 'landscape') {
          pdfWidth = Math.max(targetPageSize.width, targetPageSize.height);
          pdfHeight = Math.min(targetPageSize.width, targetPageSize.height);
        } else {
          pdfWidth = Math.min(targetPageSize.width, targetPageSize.height);
          pdfHeight = Math.max(targetPageSize.width, targetPageSize.height);
        }
      } else {
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

      // Calculate available space
      const availableWidth = pdfWidth - (margin * 2);
      const availableHeight = pdfHeight - (margin * 2);
      
      console.log(`📄 Creating ${pdfOrientation} PDF: ${pdfWidth}x${pdfHeight}pt, margin: ${margin}pt`);

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(document.name || 'Design Diary', margin, margin + 20);

      // Add document info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const infoText = `Generated: ${new Date().toLocaleString()} • ${document.cells.length} cells • ${document.canvas.pageSize.name} ${document.canvas.orientation}`;
      pdf.text(infoText, margin, margin + 35);

      // Starting position for content
      let currentY = margin + 60;
      const lineHeight = 14;
      const maxWidth = availableWidth - 20;

      // Process each cell
      for (let i = 0; i < document.cells.length; i++) {
        const cell = document.cells[i];
        
        // Check if we need a new page
        if (currentY > pdfHeight - margin - 100) {
          pdf.addPage();
          currentY = margin + 20;
        }

        // Add cell header
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const cellTitle = `Cell ${i + 1} (${cell.type.toUpperCase()})`;
        pdf.text(cellTitle, margin, currentY);
        currentY += lineHeight + 5;

        // Add cell position info
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const positionInfo = `Position: (${Math.round(cell.position.x)}, ${Math.round(cell.position.y)}) • Size: ${Math.round(cell.size.width)}×${Math.round(cell.size.height)}`;
        pdf.text(positionInfo, margin, currentY);
        currentY += lineHeight;

        // Add cell content
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        if (cell.content && cell.content.trim()) {
          // Split content into lines that fit the page width
          const lines = pdf.splitTextToSize(cell.content, maxWidth);
          
          // Add each line
          for (const line of lines) {
            // Check if we need a new page
            if (currentY > pdfHeight - margin - 20) {
              pdf.addPage();
              currentY = margin + 20;
            }
            
            pdf.text(line, margin + 10, currentY);
            currentY += lineHeight;
          }
        } else {
          pdf.setFont('helvetica', 'italic');
          pdf.text('(empty cell)', margin + 10, currentY);
          pdf.setFont('helvetica', 'normal');
          currentY += lineHeight;
        }

        // Add some spacing between cells
        currentY += 10;
      }

      console.log('📄 Simple PDF generation completed successfully');

      // Return as blob - use synchronous approach to avoid Promise issues
      const pdfBlob = pdf.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error('📄 Simple PDF generation failed:', error);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
