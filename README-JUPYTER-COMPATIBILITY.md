# JupyterLab Compatibility

The Design Diary prototype now supports JupyterLab compatibility, allowing seamless interoperability between the Design Diary format and standard Jupyter notebooks.

## Overview

The JupyterLab compatibility feature implements a dual-file approach:

1. **`.ipynb` file**: Contains cell content in standard JupyterLab format
2. **`.layout.json` file**: Contains Design Diary-specific formatting, positioning, and canvas data

This approach ensures that:
- Users with standard JupyterLab can view and edit the basic notebook content
- Users with the Design Diary extension can see the full formatted canvas experience

## Architecture

### File Structure

```
my-notebook.ipynb          # Standard Jupyter notebook
my-notebook.layout.json    # Design Diary layout data
```

### Key Components

1. **Types** (`src/types/jupyter.ts`)
   - `JupyterNotebook`: Standard Jupyter notebook format
   - `DesignDiaryLayout`: Auxiliary layout data
   - Conversion interfaces

2. **Conversion Service** (`src/services/jupyterConversionService.ts`)
   - Bidirectional conversion between formats
   - Cell type mapping and content preservation
   - Layout data extraction and reconstruction

3. **Store Integration** (`src/store/useStore.ts`)
   - Export/import actions
   - State management for converted documents

## Cell Type Mapping

| Design Diary Cell | Jupyter Cell | Notes |
|-------------------|--------------|-------|
| `code` | `code` | Direct mapping with execution counts |
| `text` | `markdown` | Content preserved as markdown |
| `equation` | `markdown` | LaTeX wrapped in `$$` or `$` |
| `image` | `markdown` | Converted to markdown image syntax |
| `graph` | `code` | Converted to matplotlib code template |
| `output` | `markdown` | Displayed as formatted output block |

## Usage

### Exporting to Jupyter

1. Click the "📓 Export .ipynb" button in the toolbar
2. Two files will be downloaded:
   - `notebook-name.ipynb` - Standard Jupyter notebook
   - `notebook-name.layout.json` - Design Diary layout data

### Importing from Jupyter

1. Click the "📥 Import .ipynb" button in the toolbar
2. Select files:
   - **Required**: `.ipynb` file
   - **Optional**: `.layout.json` file (for full Design Diary experience)
3. If no layout file is provided, default positioning will be applied

## Metadata Preservation

The conversion process preserves important metadata:

### In .ipynb files:
```json
{
  "metadata": {
    "design_diary": {
      "version": "1.0.0",
      "created": "2025-01-01T00:00:00.000Z",
      "modified": "2025-01-01T00:00:00.000Z"
    }
  },
  "cells": [
    {
      "metadata": {
        "design_diary": {
          "cell_id": "unique-cell-id",
          "original_type": "text",
          "execution_order": 1
        }
      }
    }
  ]
}
```

### In .layout.json files:
```json
{
  "version": "1.0.0",
  "notebook_id": "notebook-uuid",
  "canvas": {
    "zoom": 1.0,
    "pan": { "x": 0, "y": 0 },
    "gridSize": 20,
    "snapToGrid": true
  },
  "cells": {
    "cell-id": {
      "position": { "x": 100, "y": 100 },
      "size": { "width": 400, "height": 200 },
      "collapsed_size": { "width": 400, "height": 50 },
      "z_index": 0,
      "text_properties": {
        "font_size": 14,
        "font_family": "Arial, sans-serif"
      }
    }
  },
  "execution_history": [1640995200000]
}
```

## Benefits

### For Standard JupyterLab Users
- Can open and edit `.ipynb` files normally
- All code cells execute as expected
- Markdown cells display properly
- No dependency on Design Diary extension

### For Design Diary Users
- Full canvas experience with positioning and formatting
- Seamless import/export workflow
- Preserves all Design Diary-specific features
- Maintains execution history and cell relationships

## Implementation Details

### Conversion Process

1. **Export Process**:
   - Sorts cells by execution order for logical flow
   - Converts cell types to Jupyter equivalents
   - Extracts layout data to separate file
   - Preserves metadata in both files

2. **Import Process**:
   - Parses standard Jupyter notebook
   - Reconstructs Design Diary cells using metadata
   - Applies layout data if available
   - Falls back to default positioning if needed

### Error Handling

- Graceful fallbacks for missing layout files
- Type validation during conversion
- User feedback for parsing errors
- Preservation of original data when possible

## Future Enhancements

- Support for Jupyter widgets in graph cells
- Enhanced rich output handling
- Collaborative editing features
- Version control integration
- Plugin system for custom cell types

## Technical Notes

- Uses TypeScript for type safety
- Follows Jupyter notebook format specification v4.4
- Compatible with standard Jupyter ecosystem tools
- Maintains backward compatibility with existing Design Diary documents
