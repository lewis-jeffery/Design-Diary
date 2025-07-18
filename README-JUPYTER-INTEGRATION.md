# Jupyter Integration Architecture

## Overview

This document outlines the implementation of Jupyter compatibility for the Design Diary prototype, bringing cell definitions closer to JupyterLab as requested. The architecture enables seamless interoperability between Design Diary's rich canvas interface and standard Jupyter notebooks.

## Architecture Vision

The integration follows a dual-file approach:

1. **Standard .ipynb file** - Contains cell content in Jupyter-compatible format
2. **Auxiliary .layout file** - Contains Design Diary specific formatting, positioning, and canvas data

This approach ensures:
- Users with standard JupyterLab can open and work with the basic content
- Users with Design Diary extension see the full formatted canvas experience
- No loss of functionality in either environment

## File Structure

### Jupyter Notebook (.ipynb)
```json
{
  "cells": [
    {
      "cell_type": "code|markdown|raw",
      "id": "cell-id",
      "metadata": {
        "collapsed": false,
        "design_diary": {
          "cell_id": "original-cell-id",
          "original_type": "text|equation|image|graph|code|raw",
          "execution_order": 1
        }
      },
      "source": ["cell content"],
      "execution_count": null,
      "outputs": []
    }
  ],
  "metadata": {
    "kernelspec": {...},
    "language_info": {...},
    "design_diary": {
      "version": "1.0.0",
      "created": "2024-01-01T00:00:00Z",
      "modified": "2024-01-01T00:00:00Z"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 4
}
```

### Layout File (.layout)
```json
{
  "version": "1.0.0",
  "notebook_id": "notebook-id",
  "canvas": {
    "width": 2000,
    "height": 1500,
    "backgroundColor": "#ffffff",
    "gridSize": 20,
    "showGrid": true
  },
  "cells": {
    "cell-id": {
      "position": { "x": 100, "y": 200 },
      "size": { "width": 300, "height": 150 },
      "collapsed_size": { "width": 300, "height": 30 },
      "z_index": 1,
      "cell_type": "text",
      "rendering_hints": {
        "fontSize": 14,
        "fontFamily": "Arial, sans-serif",
        "latex": "E = mc^2",
        "displayMode": true,
        "src": "image.png",
        "alt": "Description",
        "chartType": "line",
        "data": {...}
      }
    }
  },
  "execution_history": [...]
}
```

## Cell Type Mapping

### Design Diary → Jupyter

| Design Diary Type | Jupyter Type | Conversion Strategy |
|-------------------|--------------|-------------------|
| `code` | `code` | Direct mapping with execution state |
| `text` | `markdown` | Content preserved as markdown |
| `equation` | `markdown` | LaTeX wrapped in `$$` or `$` |
| `image` | `markdown` | Converted to `![alt](src)` syntax |
| `graph` | `markdown` | Descriptive text + data in layout |
| `raw` | `raw` | Direct mapping for output cells |

### Jupyter → Design Diary

| Jupyter Type | Design Diary Type | Reconstruction Strategy |
|--------------|-------------------|----------------------|
| `code` | `code` | Direct mapping with layout positioning |
| `markdown` | `text` | Content analysis for special types |
| `raw` | `raw` | Direct mapping for output content |

## Implementation Components

### 1. Type Definitions (`src/types/jupyter.ts`)
- `JupyterNotebook` - Standard Jupyter notebook structure
- `JupyterCell` - Individual cell definitions
- `DesignDiaryLayout` - Layout and formatting metadata
- `ConversionResult` - Combined notebook + layout output

### 2. Conversion Service (`src/services/jupyterConversionService.ts`)
- `toJupyterFormat()` - Convert Design Diary → Jupyter + Layout
- `fromJupyterFormat()` - Convert Jupyter + Layout → Design Diary
- Cell-specific conversion methods
- Metadata preservation and reconstruction

### 3. Store Integration (`src/store/useStore.ts`)
- Export functionality for saving dual-file format
- Import functionality for loading from Jupyter + Layout
- Validation and error handling

## Usage Examples

### Exporting to Jupyter Format
```typescript
import { JupyterConversionService } from './services/jupyterConversionService';

const document = useStore.getState().document;
const { notebook, layout } = JupyterConversionService.toJupyterFormat(document);

// Save notebook.ipynb
await saveFile('notebook.ipynb', JSON.stringify(notebook, null, 2));

// Save notebook.layout
await saveFile('notebook.layout', JSON.stringify(layout, null, 2));
```

### Importing from Jupyter Format
```typescript
const notebookContent = await loadFile('notebook.ipynb');
const layoutContent = await loadFile('notebook.layout');

const notebook = JSON.parse(notebookContent);
const layout = JSON.parse(layoutContent);

const document = JupyterConversionService.fromJupyterFormat(notebook, layout);
useStore.getState().loadDocument(document);
```

## Benefits

### For Standard Jupyter Users
- Can open and edit basic content in any Jupyter environment
- Code cells execute normally
- Markdown cells display properly
- No dependency on Design Diary extension

### For Design Diary Users
- Full canvas experience with positioning and formatting
- Rich cell types (equations, images, graphs) preserved
- Visual layout and styling maintained
- Seamless round-trip conversion

### For Collaboration
- Teams can work with same files using different tools
- Version control works with both file types
- Progressive enhancement - basic functionality always available

## Future Enhancements

1. **JupyterLab Extension** - Native Design Diary support in JupyterLab
2. **Smart Import** - Automatic detection of Design Diary enhanced notebooks
3. **Conflict Resolution** - Handling simultaneous edits in different environments
4. **Rich Output Preservation** - Better handling of complex cell outputs
5. **Theme Synchronization** - Consistent styling across environments

## Technical Notes

### Metadata Strategy
- Design Diary metadata stored in Jupyter cell metadata
- Original cell types preserved for accurate reconstruction
- Execution order maintained for logical flow

### Content Preservation
- LaTeX equations converted to standard markdown math
- Images referenced by path/URL in markdown format
- Graph data stored in layout file with descriptive markdown

### Compatibility
- Follows Jupyter notebook format specification v4.4
- Compatible with JupyterLab 3.0+, Jupyter Notebook 6.0+
- Works with standard Python kernels and extensions

This architecture provides a solid foundation for Jupyter integration while maintaining the unique advantages of the Design Diary's canvas-based approach.
