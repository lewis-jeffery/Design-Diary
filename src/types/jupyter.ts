// JupyterLab-compatible notebook format
export interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: JupyterMetadata;
  nbformat: number;
  nbformat_minor: number;
}

export interface JupyterMetadata {
  kernelspec?: {
    display_name: string;
    language: string;
    name: string;
  };
  language_info?: {
    name: string;
    version?: string;
    mimetype?: string;
    file_extension?: string;
  };
  design_diary?: {
    version: string;
    created: string;
    modified: string;
  };
}

export type JupyterCellType = 'code' | 'markdown' | 'raw';

export interface JupyterCell {
  cell_type: JupyterCellType;
  id?: string;
  metadata: JupyterCellMetadata;
  source: string | string[];
  execution_count?: number | null;
  outputs?: JupyterOutput[];
}

export interface JupyterCellMetadata {
  collapsed?: boolean;
  scrolled?: boolean;
  design_diary?: {
    cell_id: string;
    original_type: string; // Maps to our CellType
    execution_order: number;
    source_code_cell_id?: string; // For output cells
  };
}

export interface JupyterOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  execution_count?: number;
  data?: {
    [mimeType: string]: any;
  };
  metadata?: {
    [key: string]: any;
  };
  name?: string; // for stream outputs
  text?: string | string[]; // for stream outputs
  ename?: string; // for error outputs
  evalue?: string; // for error outputs
  traceback?: string[]; // for error outputs
}

// Auxiliary format file for design diary specific data
export interface DesignDiaryLayout {
  version: string;
  notebook_id: string;
  canvas: {
    zoom: number;
    pan: { x: number; y: number };
    gridSize: number;
    snapToGrid: boolean;
    pageSize: {
      width: number;
      height: number;
      name: string;
    };
    orientation: 'portrait' | 'landscape';
    pages: number;
    pageMargin: number;
  };
  cells: {
    [cellId: string]: DesignDiaryCellLayout;
  };
  execution_history: number[];
}

export interface DesignDiaryCellLayout {
  position: { x: number; y: number };
  size: { width: number; height: number };
  collapsed_size: { width: number; height: number };
  z_index: number;
  // Type-specific layout properties
  text_properties?: {
    font_size: number;
    font_family: string;
  };
  image_properties?: {
    original_size: { width: number; height: number };
    alt: string;
  };
  equation_properties?: {
    display_mode: boolean;
  };
  graph_properties?: {
    chart_type: 'line' | 'bar' | 'scatter' | 'pie';
    config: any;
  };
  output_properties?: {
    source_code_cell_id: string;
  };
}

// Conversion utilities
export interface ConversionResult {
  notebook: JupyterNotebook;
  layout: DesignDiaryLayout;
}
