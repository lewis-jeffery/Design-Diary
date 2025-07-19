import { DesignDiaryLayout } from '../types/jupyter';

export interface CellLayoutInfo {
  id: string;
  type: string;
  preferredWidth: number;
  preferredHeight: number;
  minWidth: number;
  minHeight: number;
  priority: number; // Higher priority cells get better positions
}

export interface LayoutConstraints {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  cellSpacing: number;
  maxPages: number;
}

export interface OptimizedPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

/**
 * LayoutOptimizationService - Intelligently arranges cells across multiple pages
 * 
 * Features:
 * - Prioritizes important cells (code cells, first cells)
 * - Optimizes for readability and logical flow
 * - Supports multi-page layouts
 * - Minimizes wasted space while maintaining usability
 */
export class LayoutOptimizationService {
  
  /**
   * Generate optimized layout for imported notebook cells
   */
  static generateOptimizedLayout(
    cells: any[], 
    constraints: LayoutConstraints
  ): { [cellId: string]: any } {
    
    try {
      // Validate inputs
      if (!cells || !Array.isArray(cells) || cells.length === 0) {
        console.warn('No cells provided for layout optimization');
        return {};
      }
      
      if (!constraints || !constraints.pageWidth || !constraints.pageHeight) {
        console.error('Invalid layout constraints provided');
        return {};
      }
      
      // Step 1: Analyze cells and determine layout preferences
      const cellInfos = this.analyzeCells(cells);
      
      // Step 2: Calculate optimal grid parameters
      const gridParams = this.calculateGridParameters(cellInfos, constraints);
      
      // Step 3: Assign positions using intelligent placement
      const positions = this.assignOptimalPositions(cellInfos, gridParams, constraints);
      
      // Step 4: Convert to layout format
      return this.convertToLayoutFormat(positions);
    } catch (error) {
      console.error('Error in layout optimization:', error);
      // Return fallback layout
      return this.generateFallbackLayout(cells, constraints);
    }
  }
  
  /**
   * Analyze cells to determine their layout requirements and priorities
   */
  private static analyzeCells(cells: any[]): CellLayoutInfo[] {
    return cells.map((cell, index) => {
      const cellType = cell.cell_type;
      const content = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '');
      const contentLength = content.length;
      
      // Determine cell priority (higher = more important positioning)
      let priority = 100; // Base priority
      if (index === 0) priority += 50; // First cell gets priority
      if (cellType === 'code') priority += 30; // Code cells are important
      if (cellType === 'markdown' && content.includes('#')) priority += 20; // Headers
      
      // Determine preferred dimensions based on content
      let preferredWidth = 350;
      let preferredHeight = 180;
      
      if (cellType === 'code') {
        // Code cells need more space
        preferredWidth = 400;
        preferredHeight = Math.max(180, Math.min(300, contentLength / 3));
      } else if (cellType === 'markdown') {
        // Markdown cells vary by content
        if (content.includes('#')) {
          // Headers can be wider but shorter
          preferredWidth = 500;
          preferredHeight = 120;
        } else {
          // Regular text
          preferredHeight = Math.max(120, Math.min(250, contentLength / 4));
        }
      }
      
      return {
        id: cell.id || `cell-${index}`,
        type: cellType,
        preferredWidth,
        preferredHeight,
        minWidth: Math.max(250, preferredWidth * 0.7),
        minHeight: Math.max(100, preferredHeight * 0.6),
        priority
      };
    });
  }
  
  /**
   * Calculate optimal grid parameters for the layout
   */
  private static calculateGridParameters(
    cellInfos: CellLayoutInfo[], 
    constraints: LayoutConstraints
  ) {
    const { pageWidth, pageHeight, margin, cellSpacing } = constraints;
    const availableWidth = pageWidth - (2 * margin);
    const availableHeight = pageHeight - (2 * margin);
    
    // Calculate average cell dimensions
    const avgWidth = cellInfos.reduce((sum, cell) => sum + cell.preferredWidth, 0) / cellInfos.length;
    const avgHeight = cellInfos.reduce((sum, cell) => sum + cell.preferredHeight, 0) / cellInfos.length;
    
    // Determine optimal columns per page
    const maxCellsPerRow = Math.floor(availableWidth / (avgWidth + cellSpacing));
    const optimalCellsPerRow = Math.max(1, Math.min(maxCellsPerRow, 3)); // Limit to 3 columns for readability
    
    // Calculate rows per page
    const maxRowsPerPage = Math.floor(availableHeight / (avgHeight + cellSpacing));
    const cellsPerPage = optimalCellsPerRow * maxRowsPerPage;
    
    return {
      cellsPerRow: optimalCellsPerRow,
      rowsPerPage: maxRowsPerPage,
      cellsPerPage,
      avgWidth,
      avgHeight,
      availableWidth,
      availableHeight
    };
  }
  
  /**
   * Assign optimal positions to cells using intelligent placement
   */
  private static assignOptimalPositions(
    cellInfos: CellLayoutInfo[],
    gridParams: any,
    constraints: LayoutConstraints
  ): { [cellId: string]: OptimizedPosition } {
    
    const positions: { [cellId: string]: OptimizedPosition } = {};
    const { pageWidth, pageHeight, margin, cellSpacing } = constraints;
    const { cellsPerRow, cellsPerPage } = gridParams;
    
    // Sort cells by priority (highest first)
    const sortedCells = [...cellInfos].sort((a, b) => b.priority - a.priority);
    
    let currentPage = 0;
    let currentRow = 0;
    let currentCol = 0;
    
    for (const cell of sortedCells) {
      // Check if we need to move to next row or page
      if (currentCol >= cellsPerRow) {
        currentCol = 0;
        currentRow++;
      }
      
      // Check if we need a new page
      const cellsOnCurrentPage = currentRow * cellsPerRow + currentCol;
      if (cellsOnCurrentPage >= cellsPerPage && currentPage < constraints.maxPages - 1) {
        currentPage++;
        currentRow = 0;
        currentCol = 0;
      }
      
      // Calculate position
      const cellWidth = Math.min(
        cell.preferredWidth,
        (gridParams.availableWidth - (cellsPerRow - 1) * cellSpacing) / cellsPerRow
      );
      const cellHeight = cell.preferredHeight;
      
      const x = margin + currentCol * (cellWidth + cellSpacing);
      const y = margin + currentRow * (cellHeight + cellSpacing) + (currentPage * pageHeight);
      
      positions[cell.id] = {
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        page: currentPage
      };
      
      currentCol++;
    }
    
    return positions;
  }
  
  /**
   * Convert optimized positions to Design Diary layout format
   */
  private static convertToLayoutFormat(positions: { [cellId: string]: OptimizedPosition }) {
    const layout: { [cellId: string]: any } = {};
    
    for (const [cellId, pos] of Object.entries(positions)) {
      layout[cellId] = {
        position: { x: pos.x, y: pos.y },
        size: { width: pos.width, height: pos.height },
        collapsed_size: { width: pos.width, height: 50 },
        z_index: 0,
        cell_type: 'unknown',
        rendering_hints: {}
      };
    }
    
    return layout;
  }
  
  /**
   * Generate a simple fallback layout when optimization fails
   */
  private static generateFallbackLayout(
    cells: any[], 
    constraints: LayoutConstraints
  ): { [cellId: string]: any } {
    const layout: { [cellId: string]: any } = {};
    const cellWidth = 400;
    const cellHeight = 200;
    const margin = constraints.margin || 50;
    
    cells.forEach((cell, index) => {
      const cellId = cell.id || `cell-${index}`;
      layout[cellId] = {
        position: { x: margin, y: margin + index * (cellHeight + 20) },
        size: { width: cellWidth, height: cellHeight },
        collapsed_size: { width: cellWidth, height: 50 },
        z_index: index,
        cell_type: cell.cell_type || 'unknown',
        rendering_hints: {}
      };
    });
    
    return layout;
  }

  /**
   * Calculate the number of pages needed for the layout
   */
  static calculatePagesNeeded(positions: { [cellId: string]: OptimizedPosition }): number {
    const pages = Object.values(positions).map(pos => pos.page);
    return pages.length > 0 ? Math.max(...pages) + 1 : 1;
  }
}
