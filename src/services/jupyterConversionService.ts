import { 
  Cell, 
  CodeCell, 
  DesignDiaryDocument 
} from '../types';
import { 
  JupyterNotebook, 
  JupyterCell, 
  JupyterOutput,
  DesignDiaryLayout,
  ConversionResult 
} from '../types/jupyter';

/**
 * JupyterConversionService - Converts between Design Diary format and Jupyter Notebook format
 * 
 * This service implements the vision of bringing cell definitions closer to JupyterLab:
 * - Main content stored in standard .ipynb format (compatible with JupyterLab)
 * - Layout, formatting, and positioning data stored in auxiliary .layout file
 * - Users with standard JupyterLab can see basic content
 * - Users with Design Diary extension see full formatted canvas
 */
export class JupyterConversionService {
  /**
   * Convert Design Diary document to JupyterLab format + layout file
   * 
   * This creates two files:
   * 1. Standard .ipynb file with cell content that JupyterLab can read
   * 2. .layout file with Design Diary specific formatting and positioning
   */
  static toJupyterFormat(document: DesignDiaryDocument): ConversionResult {
    const notebook: JupyterNotebook = {
      cells: [],
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3"
        },
        language_info: {
          name: "python",
          version: "3.8.0",
          mimetype: "text/x-python",
          file_extension: ".py"
        },
        design_diary: {
          version: document.version,
          created: document.created,
          modified: document.modified
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    const layout: DesignDiaryLayout = {
      version: document.version,
      notebook_id: document.id,
      canvas: {
        ...document.canvas,
        // Ensure all required properties are present for backward compatibility
        pageSize: document.canvas.pageSize || { width: 794, height: 1123, name: 'A4' },
        orientation: document.canvas.orientation || 'landscape',
        pages: document.canvas.pages || 1,
        pageMargin: document.canvas.pageMargin || 50,
      },
      cells: {},
      execution_history: document.executionHistory
    };

    // Convert each Design Diary cell to Jupyter format
    // Sort by execution order for logical flow in Jupyter (null values go to end)
    const sortedCells = [...document.cells].sort((a, b) => {
      if (a.executionOrder === null && b.executionOrder === null) return 0;
      if (a.executionOrder === null) return 1;
      if (b.executionOrder === null) return -1;
      return a.executionOrder - b.executionOrder;
    });

    for (const cell of sortedCells) {
      const jupyterCell = this.convertCellToJupyter(cell);
      if (jupyterCell) {
        notebook.cells.push(jupyterCell);
        layout.cells[cell.id] = this.extractCellLayout(cell);
      }
    }

    return { notebook, layout };
  }

  /**
   * Convert JupyterLab format + layout file back to Design Diary document
   */
  static fromJupyterFormat(notebook: JupyterNotebook, layout: DesignDiaryLayout): DesignDiaryDocument {
    const document: DesignDiaryDocument = {
      version: layout.version,
      id: layout.notebook_id,
      name: 'Imported Notebook',
      created: notebook.metadata.design_diary?.created || new Date().toISOString(),
      modified: notebook.metadata.design_diary?.modified || new Date().toISOString(),
      canvas: layout.canvas,
      cells: [],
      executionHistory: layout.execution_history
    };

    // Convert Jupyter cells back to Design Diary cells using layout info
    // Track execution order for code cells to maintain logical sequence
    let codeExecutionOrder = 1;
    
    for (const jupyterCell of notebook.cells) {
      const cellId = jupyterCell.metadata.design_diary?.cell_id || jupyterCell.id || this.generateId();
      const cellLayout = layout.cells[cellId];
      
      console.log('🔧 DEBUG: Processing Jupyter cell:', cellId, jupyterCell.cell_type, 'hasOutputs:', jupyterCell.outputs && jupyterCell.outputs.length > 0, 'hasLayout:', !!cellLayout);
      
      if (cellLayout) {
        const designDiaryCell = this.convertJupyterToCell(jupyterCell, cellLayout, codeExecutionOrder);
        if (designDiaryCell) {
          console.log('🔧 DEBUG: Created Design Diary cell:', designDiaryCell.id, designDiaryCell.type, 'at', designDiaryCell.position);
          document.cells.push(designDiaryCell);
          
          // Skip creating output cells during import - they're already stored as separate raw cells in the notebook
          // The convertJupyterOutputsToDesignDiaryCells method is only used for fresh Jupyter notebooks 
          // that have outputs in the outputs array but haven't been exported from Design Diary before
          if (designDiaryCell.type === 'code' && jupyterCell.cell_type === 'code' && jupyterCell.outputs && jupyterCell.outputs.length > 0) {
            // Check if this is a fresh import (no design_diary metadata) vs re-import of exported notebook
            const hasDesignDiaryMetadata = jupyterCell.metadata.design_diary?.cell_id;
            
            if (!hasDesignDiaryMetadata) {
              // This is a fresh Jupyter notebook - create output cells from outputs array
              console.log('🔧 DEBUG: Fresh Jupyter import - converting outputs to Design Diary cells for cell:', designDiaryCell.id);
              const outputCells = this.convertJupyterOutputsToDesignDiaryCells(
                jupyterCell.outputs, 
                designDiaryCell.id, 
                designDiaryCell.position, 
                designDiaryCell.size,
                designDiaryCell.executionOrder
              );
              console.log('🔧 DEBUG: Created', outputCells.length, 'output cells for', designDiaryCell.id);
              document.cells.push(...outputCells);
            } else {
              // This is a re-import of a Design Diary exported notebook - outputs are already separate cells
              console.log('🔧 DEBUG: Re-importing Design Diary notebook - skipping output conversion for cell:', designDiaryCell.id);
            }
          }
          
          // Increment execution order only for code cells
          if (designDiaryCell.type === 'code') {
            codeExecutionOrder++;
          }
        }
      }
    }

    // Post-process to resolve pending sourceCodeCellId references
    this.resolvePendingOutputCellReferences(document);

    console.log('🔧 DEBUG: Final document has', document.cells.length, 'cells');
    document.cells.forEach((cell, index) => {
      console.log(`🔧 DEBUG: Cell ${index + 1}:`, cell.id, cell.type, 'at', cell.position, 'content:', cell.type === 'raw' ? cell.content.substring(0, 30) + '...' : (cell.content ? cell.content.substring(0, 30) + '...' : ''));
    });

    return document;
  }

  /**
   * Convert a Design Diary cell to Jupyter format
   * 
   * Strategy:
   * - Code cells -> Jupyter code cells (direct mapping)
   * - Text cells -> Jupyter markdown cells
   * - Equation cells -> Jupyter markdown cells with LaTeX
   * - Image cells -> Jupyter markdown cells with image markdown
   * - Graph cells -> Jupyter markdown cells with chart description
   * - Output cells -> Jupyter raw cells
   */
  private static convertCellToJupyter(cell: Cell): JupyterCell | null {
    const baseMetadata = {
      collapsed: cell.collapsed,
      design_diary: {
        cell_id: cell.id,
        original_type: cell.type,
        execution_order: cell.executionOrder
      }
    };

    // Handle code cells - direct mapping to Jupyter
    if (cell.type === 'code') {
      const codeCell = cell as CodeCell;
      const sourceLines = codeCell.content.split('\n').map((line, index, array) => {
        return index === array.length - 1 ? line : line + '\n';
      });
      return {
        cell_type: 'code',
        id: cell.id,
        metadata: baseMetadata,
        source: sourceLines,
        execution_count: codeCell.executionCount || null,
        outputs: codeCell.output ? this.convertOutputToJupyter(codeCell.output, codeCell.executionCount) : []
      };
    }

    // Handle markdown cells - check renderingHints for content type
    if (cell.type === 'markdown') {
      const markdownCell = cell as any;
      const contentType = markdownCell.renderingHints?.contentType;
      let markdownContent = '';
      
      if (contentType === 'text' || !contentType) {
        markdownContent = cell.content;
      } else if (contentType === 'equation') {
        // Extract LaTeX from equation cell
        const latex = markdownCell.renderingHints?.latex || cell.content;
        const displayMode = markdownCell.renderingHints?.displayMode !== false;
        markdownContent = displayMode ? `$$${latex}$$` : `$${latex}$`;
      } else if (contentType === 'image') {
        // Convert image cell to markdown image syntax
        const src = markdownCell.renderingHints?.src || '';
        const alt = markdownCell.renderingHints?.alt || 'Image';
        markdownContent = `![${alt}](${src})`;
      } else if (contentType === 'graph') {
        // Convert graph to descriptive markdown
        const chartType = markdownCell.renderingHints?.chartType || 'chart';
        markdownContent = `**${chartType.toUpperCase()} CHART**\n\n*Chart data and configuration stored in layout file*`;
      } else {
        // Fallback for any other content types
        markdownContent = cell.content;
      }

      // Return as markdown cell
      const textLines = markdownContent.split('\n').map((line, index, array) => {
        return index === array.length - 1 ? line : line + '\n';
      });
      
      return {
        cell_type: 'markdown',
        id: cell.id,
        metadata: baseMetadata,
        source: textLines
      };
    } else if (cell.type === 'raw') {
      // Raw/output cells become raw cells in Jupyter
      return {
        cell_type: 'raw',
        id: cell.id,
        metadata: baseMetadata,
        source: [cell.content]
      };
    }

    // Fallback - should not reach here with current type system
    return null;
  }

  /**
   * Convert Jupyter cell back to Design Diary cell using layout information
   */
  private static convertJupyterToCell(jupyterCell: JupyterCell, layout: any, codeExecutionOrder?: number): Cell | null {
    const cellId = jupyterCell.metadata.design_diary?.cell_id || jupyterCell.id || this.generateId();
    
    // Assign execution order based on design concept: code cells get logical sequence numbers
    let executionOrder: number | null = null;
    if (jupyterCell.cell_type === 'code') {
      // For code cells, use the provided execution order (design sequence)
      // This represents the intended logical flow, not execution history
      if (codeExecutionOrder !== undefined) {
        executionOrder = codeExecutionOrder;
      } else {
        // Fallback to existing metadata if available
        const jupyterExecutionCount = jupyterCell.execution_count;
        const designDiaryExecutionOrder = jupyterCell.metadata.design_diary?.execution_order;
        
        if (designDiaryExecutionOrder !== null && designDiaryExecutionOrder !== undefined) {
          executionOrder = designDiaryExecutionOrder;
        } else if (jupyterExecutionCount !== null && jupyterExecutionCount !== undefined) {
          executionOrder = jupyterExecutionCount;
        }
      }
    }
    // For markdown/raw cells, executionOrder stays null (they don't participate in execution flow)

    const baseCell = {
      id: cellId,
      position: layout.position || { x: 0, y: 0 },
      size: layout.size || { width: 400, height: 200 },
      executionOrder,
      collapsed: jupyterCell.metadata.collapsed || false,
      collapsedSize: layout.collapsed_size || { width: 400, height: 50 },
      selected: false,
      zIndex: layout.z_index || 1
    };

    const content = Array.isArray(jupyterCell.source) ? 
      jupyterCell.source.join('').replace(/\n$/, '') : // Remove trailing newline if present
      (jupyterCell.source || '');

    // Handle standard Jupyter cell types
    if (jupyterCell.cell_type === 'code') {
      return {
        ...baseCell,
        type: 'code',
        content,
        language: 'python',
        firstCommentLines: this.extractCommentLines(jupyterCell.source),
        executionCount: jupyterCell.execution_count || undefined,
        renderingHints: {}
      } as CodeCell;
    }

    if (jupyterCell.cell_type === 'markdown') {
      // Try to detect if this was originally a specialized cell type
      const renderingHints = layout.rendering_hints || {};
      
      // Check for equation patterns
      if (content.match(/^\$\$.*\$\$$/) || content.match(/^\$.*\$$/)) {
        const latex = content.replace(/^\$\$?|\$\$?$/g, '');
        const displayMode = content.startsWith('$$');
        return {
          ...baseCell,
          type: 'markdown',
          content: latex,
          renderingHints: {
            contentType: 'equation' as const,
            latex,
            displayMode
          }
        };
      }
      
      // Check for image patterns
      if (content.match(/^!\[.*\]\(.*\)$/)) {
        const match = content.match(/^!\[(.*)\]\((.*)\)$/);
        const alt = match?.[1] || 'Image';
        const src = match?.[2] || '';
        return {
          ...baseCell,
          type: 'markdown',
          content,
          renderingHints: {
            contentType: 'image' as const,
            src,
            alt,
            originalSize: { width: 300, height: 200 }
          }
        };
      }
      
      // Check for graph patterns
      if (content.includes('CHART') || renderingHints.contentType === 'graph') {
        return {
          ...baseCell,
          type: 'markdown',
          content,
          renderingHints: {
            contentType: 'graph' as const,
            chartType: renderingHints.chartType || 'line',
            data: renderingHints.data || {},
            config: renderingHints.config || {}
          }
        };
      }
      
      // Default to text markdown cell
      return {
        ...baseCell,
        type: 'markdown',
        content,
        renderingHints: {
          contentType: 'text' as const,
          fontSize: renderingHints.fontSize || 14,
          fontFamily: renderingHints.fontFamily || 'Arial, sans-serif'
        }
      };
    }

    if (jupyterCell.cell_type === 'raw') {
      const rawCell = {
        ...baseCell,
        type: 'raw',
        content,
        format: 'text'
      } as any;
      
      // Check if this raw cell is an output cell by looking at its metadata
      const originalType = jupyterCell.metadata.design_diary?.original_type;
      if (originalType === 'raw') {
        // This is an output cell - we need to link it to its source code cell
        // Look for a code cell that would logically be the source of this output
        // This is a heuristic based on execution order and positioning
        const executionOrder = jupyterCell.metadata.design_diary?.execution_order;
        if (executionOrder !== null && executionOrder !== undefined) {
          // Mark this as an output cell with metadata to help identify its source
          rawCell.sourceCodeCellId = `pending-${executionOrder}`; // Will be resolved later
          rawCell.outputType = 'text';
          rawCell.success = true;
          rawCell.executionTime = new Date().toISOString();
        }
      }
      
      return rawCell;
    }

    // Fallback for unknown cell types
    console.warn(`Unknown cell type: ${jupyterCell.cell_type}, converting to markdown`);
    return {
      ...baseCell,
      type: 'markdown',
      content: `[UNKNOWN CELL TYPE: ${jupyterCell.cell_type}]\n${content}`,
      renderingHints: {
        contentType: 'text' as const,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif'
      }
    };
  }

  /**
   * Extract cell layout information for the auxiliary layout file
   */
  private static extractCellLayout(cell: Cell): any {
    const baseLayout = {
      position: cell.position,
      size: cell.size,
      collapsed_size: cell.collapsedSize,
      z_index: cell.zIndex
    };

    // Add type-specific layout properties
    const cellWithHints = cell as any;
    const renderingHints = cellWithHints.renderingHints || {};

    return {
      ...baseLayout,
      cell_type: cell.type,
      rendering_hints: renderingHints
    };
  }

  /**
   * Convert output to Jupyter format
   */
  private static convertOutputToJupyter(output: any, executionCount?: number): JupyterOutput[] {
    const outputs: JupyterOutput[] = [];

    if (output.stdout) {
      outputs.push({
        output_type: 'stream',
        name: 'stdout',
        text: output.stdout.split('\n')
      });
    }

    if (output.stderr) {
      outputs.push({
        output_type: 'stream',
        name: 'stderr',
        text: output.stderr.split('\n')
      });
    }

    return outputs;
  }

  /**
   * Extract comment lines from source code
   */
  private static extractCommentLines(source: string | string[]): string[] {
    const lines = Array.isArray(source) ? source : source.split('\n');
    return lines.filter(line => line.trim().startsWith('#')).slice(0, 3);
  }

  /**
   * Convert Jupyter outputs to Design Diary output cells
   */
  private static convertJupyterOutputsToDesignDiaryCells(
    outputs: JupyterOutput[], 
    sourceCodeCellId: string, 
    codePosition: { x: number; y: number }, 
    codeSize: { width: number; height: number },
    executionOrder: number | null
  ): Cell[] {
    const outputCells: Cell[] = [];
    let outputYOffset = 0;

    for (const output of outputs) {
      if (output.output_type === 'stream') {
        const streamOutput = output as any;
        const content = Array.isArray(streamOutput.text) ? streamOutput.text.join('') : streamOutput.text;
        const outputType = streamOutput.name === 'stderr' ? 'error' : 'text';
        
        const outputCell: Cell = {
          id: this.generateId(),
          type: 'raw',
          position: {
            x: codePosition.x + codeSize.width + 20,
            y: codePosition.y + outputYOffset,
          },
          size: { 
            width: 400, 
            height: Math.max(100, Math.min(300, content.split('\n').length * 20 + 40)) 
          },
          executionOrder,
          collapsed: false,
          collapsedSize: { width: 400, height: 50 },
          selected: false,
          zIndex: 10,
          content,
          format: 'text',
        } as any;
        
        // Mark this as an output cell for the source code cell
        (outputCell as any).sourceCodeCellId = sourceCodeCellId;
        (outputCell as any).outputType = outputType;
        (outputCell as any).success = outputType !== 'error';
        (outputCell as any).executionTime = new Date().toISOString();
        
        outputCells.push(outputCell);
        outputYOffset += outputCell.size.height + 20;
      }
      
      // Handle other output types like display_data, execute_result, etc.
      else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
        const displayOutput = output as any;
        
        // Handle image outputs
        if (displayOutput.data && (displayOutput.data['image/png'] || displayOutput.data['image/jpeg'])) {
          const imageData = displayOutput.data['image/png'] || displayOutput.data['image/jpeg'];
          const outputCell: Cell = {
            id: this.generateId(),
            type: 'raw',
            position: {
              x: codePosition.x + codeSize.width + 20,
              y: codePosition.y + outputYOffset,
            },
            size: { width: 400, height: 300 },
            executionOrder,
            collapsed: false,
            collapsedSize: { width: 400, height: 50 },
            selected: false,
            zIndex: 10,
            content: '', // No text content for image cells
            format: 'text',
          } as any;
          
          // Add image output data
          (outputCell as any).outputs = [{
            format: 'image',
            data: `data:image/png;base64,${imageData}`,
            metadata: displayOutput.metadata || {}
          }];
          
          (outputCell as any).sourceCodeCellId = sourceCodeCellId;
          (outputCell as any).outputType = 'image';
          (outputCell as any).success = true;
          (outputCell as any).executionTime = new Date().toISOString();
          
          outputCells.push(outputCell);
          outputYOffset += outputCell.size.height + 20;
        }
        
        // Handle text/plain outputs
        else if (displayOutput.data && displayOutput.data['text/plain']) {
          const textData = Array.isArray(displayOutput.data['text/plain']) 
            ? displayOutput.data['text/plain'].join('') 
            : displayOutput.data['text/plain'];
            
          const outputCell: Cell = {
            id: this.generateId(),
            type: 'raw',
            position: {
              x: codePosition.x + codeSize.width + 20,
              y: codePosition.y + outputYOffset,
            },
            size: { 
              width: 400, 
              height: Math.max(100, Math.min(300, textData.split('\n').length * 20 + 40)) 
            },
            executionOrder,
            collapsed: false,
            collapsedSize: { width: 400, height: 50 },
            selected: false,
            zIndex: 10,
            content: textData,
            format: 'text',
          } as any;
          
          (outputCell as any).sourceCodeCellId = sourceCodeCellId;
          (outputCell as any).outputType = 'text';
          (outputCell as any).success = true;
          (outputCell as any).executionTime = new Date().toISOString();
          
          outputCells.push(outputCell);
          outputYOffset += outputCell.size.height + 20;
        }
      }
      
      // Handle error outputs
      else if (output.output_type === 'error') {
        const errorOutput = output as any;
        const errorContent = `${errorOutput.ename}: ${errorOutput.evalue}\n${errorOutput.traceback?.join('\n') || ''}`;
        
        const outputCell: Cell = {
          id: this.generateId(),
          type: 'raw',
          position: {
            x: codePosition.x + codeSize.width + 20,
            y: codePosition.y + outputYOffset,
          },
          size: { 
            width: 400, 
            height: Math.max(150, Math.min(400, errorContent.split('\n').length * 20 + 40)) 
          },
          executionOrder,
          collapsed: false,
          collapsedSize: { width: 400, height: 50 },
          selected: false,
          zIndex: 10,
          content: errorContent,
          format: 'text',
        } as any;
        
        (outputCell as any).sourceCodeCellId = sourceCodeCellId;
        (outputCell as any).outputType = 'error';
        (outputCell as any).success = false;
        (outputCell as any).executionTime = new Date().toISOString();
        
        outputCells.push(outputCell);
        outputYOffset += outputCell.size.height + 20;
      }
    }

    return outputCells;
  }

  /**
   * Resolve pending sourceCodeCellId references in output cells
   */
  private static resolvePendingOutputCellReferences(document: DesignDiaryDocument): void {
    // Create a map of execution order to code cell ID
    const executionOrderToCodeCellId = new Map<number, string>();
    
    // First pass: collect all code cells and their execution orders
    for (const cell of document.cells) {
      if (cell.type === 'code' && cell.executionOrder !== null) {
        executionOrderToCodeCellId.set(cell.executionOrder, cell.id);
      }
    }
    
    // Second pass: resolve pending references in output cells
    for (const cell of document.cells) {
      const cellWithMetadata = cell as any;
      if (cell.type === 'raw' && cellWithMetadata.sourceCodeCellId && 
          cellWithMetadata.sourceCodeCellId.startsWith('pending-')) {
        
        const executionOrder = parseInt(cellWithMetadata.sourceCodeCellId.replace('pending-', ''));
        const actualCodeCellId = executionOrderToCodeCellId.get(executionOrder);
        
        if (actualCodeCellId) {
          cellWithMetadata.sourceCodeCellId = actualCodeCellId;
          console.log('🔧 DEBUG: Resolved output cell', cell.id, 'to code cell', actualCodeCellId);
        } else {
          // If we can't resolve it, remove the sourceCodeCellId to avoid confusion
          delete cellWithMetadata.sourceCodeCellId;
          delete cellWithMetadata.outputType;
          console.log('🔧 DEBUG: Could not resolve output cell', cell.id, 'for execution order', executionOrder);
        }
      }
    }
  }

  /**
   * Generate a unique ID
   */
  private static generateId(): string {
    return Math.random().toString(36).substring(2, 11);
  }
}
