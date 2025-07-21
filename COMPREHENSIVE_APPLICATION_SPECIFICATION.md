# Visual Jupyter Notebook Editor - Comprehensive Application Specification

## Executive Summary

Create a modern, visual interface for creating and editing Jupyter notebooks with a canvas-based approach that transforms the traditional linear notebook experience into a flexible, multi-page document editor while maintaining full compatibility with the Jupyter ecosystem.

## Core Vision & Objectives

### Primary Goals
- **Visual Freedom**: Break away from linear notebook constraints with free-form cell positioning
- **Professional Layout**: Document-like experience with structured pages and standard paper sizes
- **Jupyter Compatibility**: Seamless import/export of .ipynb files with layout preservation
- **Rich Execution**: Full Python code execution with matplotlib integration and magic command support
- **User Experience**: Intuitive interface with context-aware controls and professional polish

### Key Differentiators
- Canvas-based cell positioning vs. linear notebook structure
- Multi-page document system with professional layouts
- Advanced output cell management with scrolling controls
- Enhanced matplotlib integration with magic command processing
- Context-aware UI that adapts to user focus and selection

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript for type safety and modern development
- **State Management**: Zustand for lightweight, performant state management
- **Styling**: Styled Components for CSS-in-JS with theming support
- **Code Editor**: Monaco Editor (VS Code engine) for syntax highlighting and IntelliSense
- **Math Rendering**: MathJax for LaTeX equation display
- **Build System**: Create React App with TypeScript template

### Backend Stack
- **Runtime**: Node.js with Express for RESTful API
- **Python Integration**: Child process spawning with persistent session management
- **File System**: Local file operations for notebook import/export
- **Process Management**: Graceful shutdown handling and session cleanup

### Key Dependencies
```json
{
  "react": "^18.0.0",
  "typescript": "^4.9.0",
  "styled-components": "^5.3.0",
  "zustand": "^4.3.0",
  "@monaco-editor/react": "^4.4.0",
  "mathjax": "^3.2.0",
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "uuid": "^9.0.0"
}
```

## Core Features & Components

### 1. Multi-Page Canvas System

#### Canvas Component Architecture
```typescript
interface CanvasState {
  zoom: number;
  pan: Position;
  gridSize: number;
  snapToGrid: boolean;
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  pages: number;
  pageMargin: number;
}

interface PageSize {
  width: number;
  height: number;
  name: string; // 'A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid'
}
```

#### Key Features
- **Professional Layout**: Standard paper sizes (A4, A3, A5, Letter, Legal, Tabloid)
- **Flexible Orientation**: Portrait and landscape modes with single-click switching
- **Document-Like Experience**: Clean white pages with shadows for professional appearance
- **Automatic Page Management**: New pages created automatically as content grows
- **Zoom & Pan**: Smooth zooming (0.25x to 3x) with pan controls
- **Grid System**: Optional grid snapping for precise cell alignment

#### Implementation Requirements
- Canvas virtualization for performance with large documents
- Smooth zoom/pan with momentum scrolling
- Page boundaries with visual indicators
- Automatic page creation when cells extend beyond current pages
- Export to PDF maintaining page layouts

### 2. Advanced Cell System

#### Cell Type Hierarchy
```typescript
interface BaseCell {
  id: string;
  type: CellType;
  position: Position;
  size: Size;
  executionOrder: number | null;
  collapsed: boolean;
  collapsedSize: Size;
  selected: boolean;
  zIndex: number;
}

type CellType = 'code' | 'markdown' | 'raw';
```

#### Code Cells
- **Monaco Editor Integration**: VS Code-quality editing experience
- **Syntax Highlighting**: Python syntax with error detection
- **Auto-completion**: IntelliSense for Python libraries
- **Execution Controls**: Run button, execution counter, timing information
- **Output Management**: Rich output display with scrolling controls

#### Markdown Cells
- **Live Preview**: Real-time markdown rendering
- **Enhanced Types**: Text, equations (LaTeX), images, graphs
- **Rich Formatting**: Support for tables, lists, code blocks
- **Math Support**: MathJax integration for LaTeX equations

#### Output Cells (Critical Feature)
```typescript
interface OutputCell extends RawCell {
  outputs?: RichOutput[];
  stdout?: string;
  stderr?: string;
  success?: boolean;
  executionTime?: string;
  sessionId?: string;
  sourceCodeCellId: string;
  executionCount?: number;
}
```

#### Advanced Output Management
- **Context-Aware Controls**: Show/hide based on cell selection
- **Dual Scroll Modes**: 
  - Full mode: Uses entire cell height, no scrollbars
  - Scroll mode: Fixed height with enhanced scrollbars
- **Enhanced Scrollbars**: 12px width, rounded corners, hover effects
- **Scroll Isolation**: Output scrolling doesn't affect canvas navigation
- **Responsive Sizing**: Output areas resize with cell dimensions
- **Rich Output Support**: Text, images, plots, HTML, JSON

### 3. Python Execution Engine

#### Persistent Session Management
```javascript
// Key server architecture for maintaining Python state
const persistentSessions = new Map(); // Document-specific Python processes
const PERSISTENT_PYTHON_RUNNER = `
import sys
import json
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

_session_globals = {}  # Persistent variable namespace
_cell_outputs = {}     # Track outputs per cell

def handle_magic_commands(code):
    # Strip IPython magic commands (%matplotlib inline, etc.)
    # Return cleaned code for execution
    
def execute_code_block(code, execution_id):
    # Execute in persistent namespace
    # Capture matplotlib figures automatically
    # Return structured output
`;
```

#### Magic Command Processing (Critical Feature)
- **IPython Compatibility**: Full support for `%matplotlib inline`, `%time`, `%who`, etc.
- **Command Stripping**: Remove magic commands before Python execution
- **Seamless Integration**: Notebooks work identically in Jupyter and Design Diary
- **Line & Cell Magics**: Support both `%magic` and `%%magic` syntax

#### Execution Features
- **Persistent Variables**: Variables maintained across cell executions
- **Rich Output Capture**: Automatic matplotlib figure capture
- **Error Handling**: Comprehensive error capture with full tracebacks
- **Session Management**: Document-specific Python processes
- **Graceful Cleanup**: Proper session termination and resource cleanup

### 4. Enhanced User Interface

#### Context-Aware Controls
```typescript
// Controls visibility based on cell selection
const OutputHeader = styled.div<{ $selected?: boolean }>`
  opacity: ${props => props.$selected ? 1 : 0};
  transition: opacity 0.2s ease-in-out;
`;
```

#### Key UI Principles
- **Progressive Disclosure**: Show controls only when relevant
- **Smooth Transitions**: Fade in/out animations for professional feel
- **Visual Hierarchy**: Clear distinction between different UI elements
- **Responsive Design**: Adapts to different screen sizes and zoom levels

#### Toolbar Components
- **File Operations**: New, Open, Save, Save As, Export
- **Cell Management**: Add Code, Add Text, Add Image, Add Equation
- **Layout Controls**: Page size, orientation, grid toggle
- **Execution Controls**: Run cell, run all, interrupt, restart
- **View Controls**: Zoom in/out, fit to page, grid toggle

### 5. File System Integration

#### Jupyter Compatibility
```typescript
interface DesignDiaryDocument {
  version: string;
  id: string;
  name: string;
  created: string;
  modified: string;
  canvas: CanvasState;
  cells: Cell[];
  executionHistory: number[];
}
```

#### File Format Strategy
- **Standard .ipynb**: Full Jupyter notebook compatibility
- **Layout .json**: Separate file for Design Diary-specific layout data
- **Dual Export**: Both files saved together for complete preservation
- **Import Handling**: Graceful handling of standard Jupyter notebooks

#### Conversion Services
```typescript
class JupyterConversionService {
  static exportToJupyter(document: DesignDiaryDocument): JupyterNotebook;
  static importFromJupyter(notebook: JupyterNotebook): DesignDiaryDocument;
  static preserveLayout(document: DesignDiaryDocument): LayoutData;
  static restoreLayout(notebook: JupyterNotebook, layout: LayoutData): DesignDiaryDocument;
}
```

## Critical Implementation Details

### 1. Output Cell Scrolling System

This is a complex feature that requires careful implementation:

#### Scroll Mode Implementation
```css
/* Dynamic sizing based on scroll mode */
${props => props.$scrollable ? `
  height: calc(100% - 40px); /* Use available height minus header */
  min-height: 200px; /* Minimum height for usability */
  max-height: calc(100% - 40px); /* Constrain to available space */
  overflow-y: auto;
  overflow-x: auto;
  
  /* Enhanced scrollbar styling */
  &::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 6px;
    border: 2px solid #f1f1f1;
  }
` : `
  height: calc(100% - 40px);
  overflow: visible;
  max-height: none;
  
  /* Hide scrollbars in full mode */
  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none; /* Firefox */
`}
```

#### Event Handling
```typescript
const handleWheel = (e: React.WheelEvent) => {
  e.stopPropagation(); // Prevent canvas scrolling
  e.preventDefault();
  
  const target = e.currentTarget as HTMLElement;
  const scrollAmount = e.deltaY;
  
  if (isScrollable) {
    target.scrollTop += scrollAmount;
  }
};
```

### 2. Magic Command Processing

Critical for Jupyter compatibility:

```python
def handle_magic_commands(code):
    """Process IPython magic commands and return cleaned code"""
    lines = code.split('\n')
    cleaned_lines = []
    in_cell_magic = False
    
    for line in lines:
        stripped = line.strip()
        
        # Handle cell magics (%%magic)
        if stripped.startswith('%%'):
            in_cell_magic = True
            continue
        elif in_cell_magic and not stripped.startswith('%'):
            continue
        elif in_cell_magic and stripped.startswith('%'):
            in_cell_magic = False
            continue
        
        # Handle line magics (%magic)
        if stripped.startswith('%'):
            continue
        else:
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)
```

### 3. Cell Positioning & Resizing

```typescript
const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  selectCell(cell.id, e.ctrlKey || e.metaKey);
  startDrag(cell.id, { x: 10, y: 10 });
  
  const handleGlobalMouseMove = (e: MouseEvent) => {
    // Calculate position accounting for zoom and pan
    const canvasContainer = document.querySelector('.canvas-container');
    const canvasRect = canvasContainer.getBoundingClientRect();
    
    // Get canvas transform values
    const zoom = getCanvasZoom();
    const pan = getCanvasPan();
    
    const x = (e.clientX - canvasRect.left - pan.x) / zoom;
    const y = (e.clientY - canvasRect.top - pan.y) / zoom;
    
    updateCellPosition(cell.id, { x: x - 10, y: y - 10 });
  };
  
  document.addEventListener('mousemove', handleGlobalMouseMove);
  document.addEventListener('mouseup', handleGlobalMouseUp);
}, [cell.id, selectCell, startDrag, updateCellPosition]);
```

## Development Workflow

### 1. Project Setup
```bash
# Frontend setup
npx create-react-app design-diary --template typescript
cd design-diary
npm install styled-components zustand @monaco-editor/react

# Backend setup
mkdir server
cd server
npm init -y
npm install express cors uuid
```

### 2. Development Scripts
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "server": "cd server && node server.js",
    "dev": "concurrently \"npm start\" \"npm run server\""
  }
}
```

### 3. Testing Strategy
- **Unit Tests**: Jest for component testing
- **Integration Tests**: Testing Python execution pipeline
- **E2E Tests**: Cypress for full workflow testing
- **Manual Testing**: Comprehensive test notebooks (magic_test.ipynb)

## Deployment Considerations

### Development Environment
- **Local Development**: React dev server + Node.js backend
- **Hot Reload**: Automatic refresh on code changes
- **Debug Tools**: React DevTools, browser debugging

### Production Environment
- **Build Process**: Optimized React build with code splitting
- **Server Deployment**: Express server with PM2 process management
- **Docker Support**: Containerized deployment with docker-compose
- **Environment Variables**: Configuration for different environments

### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Backend Dockerfile
FROM node:16-alpine
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
EXPOSE 5000
CMD ["node", "server.js"]
```

## Quality Assurance

### Code Quality
- **TypeScript**: Full type safety with strict mode
- **ESLint**: Code linting with React and TypeScript rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks

### Performance Considerations
- **Canvas Virtualization**: Render only visible cells for large documents
- **Lazy Loading**: Load cell content on demand
- **Memory Management**: Proper cleanup of Python sessions
- **Bundle Optimization**: Code splitting and tree shaking

### Security Considerations
- **Code Execution**: Sandboxed Python execution environment
- **File Access**: Restricted file system access
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Proper cross-origin request handling

## Success Metrics

### User Experience Metrics
- **Time to First Cell**: How quickly users can start working
- **Cell Manipulation Speed**: Responsiveness of drag/resize operations
- **Execution Performance**: Python code execution speed
- **Error Recovery**: Graceful handling of execution errors

### Technical Metrics
- **Bundle Size**: Frontend JavaScript bundle size
- **Memory Usage**: Python session memory consumption
- **Load Time**: Application startup time
- **Compatibility**: Jupyter notebook import/export success rate

## Recent Enhancements (v1.0.2)

### Execution Numbering System (Critical Fix)
- **Sequential Numbering Logic**: Fixed execution order to maintain sequential numbering (1, 2, 3, ...) without gaps
- **Automatic Renumbering**: When cells are deleted, all remaining code cells are automatically renumbered to maintain sequence
- **Smart Cell Creation**: New code cells get the next logical execution number based on existing cell count
- **Duplicate Cell Handling**: Duplicated code cells trigger automatic renumbering to maintain proper sequence
- **User Experience**: Eliminates confusion from gaps in execution sequence, users always know exact cell count

```typescript
// Sequential execution numbering implementation
renumberCodeCells: () => {
  const codeCells = document.cells
    .filter(cell => cell.type === 'code')
    .sort((a, b) => {
      // Sort by current execution order, then by position
      if (a.executionOrder !== null && b.executionOrder !== null) {
        return a.executionOrder - b.executionOrder;
      }
      if (a.executionOrder !== null) return -1;
      if (b.executionOrder !== null) return 1;
      // If both are null, sort by position
      if (a.position.y !== b.position.y) return a.position.y - b.position.y;
      return a.position.x - b.position.x;
    });

  // Renumber sequentially starting from 1
  const updatedCells = document.cells.map(cell => {
    if (cell.type === 'code') {
      const index = codeCells.findIndex(c => c.id === cell.id);
      return { ...cell, executionOrder: index + 1 };
    }
    return cell;
  });
}
```

### Output Cell Management (Enhanced)
- **Duplicate Prevention**: Fixed issue where executing the same cell multiple times created duplicate output cells
- **Complete Output Removal**: Improved removal logic ensures all related output cells are properly cleaned up
- **Consistent Criteria**: Unified logic for finding and removing output cells prevents orphaned outputs
- **Performance Optimization**: Efficient output cell management reduces memory usage and improves responsiveness

### Multi-Machine Development Support
- **Comprehensive Sync System**: Complete synchronization solution for working across multiple machines
- **Automated Scripts**: `sync-start.sh` and `sync-end.sh` for seamless machine switching
- **VS Code Integration**: Settings Sync configuration with recommended extensions
- **Cline Chat Preservation**: Export/import system for maintaining chat history across machines
- **Environment Consistency**: Python requirements.txt and virtual environment setup
- **GitHub Codespaces**: Pre-configured development containers for instant setup

### Development Workflow Enhancements
```bash
# New machine setup
./setup-new-machine.sh

# Daily workflow
./sync-start.sh  # Pull changes and start development
./sync-end.sh    # Save work and push changes

# Available sync scripts
- setup-new-machine.sh: Complete setup for new machines
- sync-start.sh: Pull changes and start development  
- sync-end.sh: Save work and push changes
- cleanup.sh: Clean up processes and temp files
- restart.sh: Restart Design Diary servers
```

### Image Display System (Previous v1.0.1)
- **Fixed Image Rendering**: Resolved issue where images showed only alt text instead of actual images
- **Enhanced URL Transformation**: Proper conversion of relative image URLs to absolute server URLs
- **Visual Error Feedback**: Failed images now show red borders and console error logging
- **Multiple Format Support**: Both HTML `<img>` tags and Markdown `![alt](src)` syntax supported
- **Server-Side Image Serving**: Robust `/api/notebook-files/` endpoint for serving notebook assets

### Dropbox Integration & File Access (Previous v1.0.1)
- **Symbolic Link Resolution**: Automatic detection and resolution of Dropbox CloudStorage symbolic links
- **Enhanced Error Handling**: User-friendly error messages with specific guidance for permission issues
- **CloudStorage Support**: Full compatibility with modern macOS Dropbox integration
- **Permission Diagnostics**: Comprehensive error messages explaining how to grant Full Disk Access
- **Directory Browser Improvements**: Better navigation and error recovery in file browser

### Technical Architecture Improvements
- **State Management**: Enhanced Zustand store with proper async handling and error recovery
- **Type Safety**: Comprehensive TypeScript interfaces for all components and state
- **Error Handling**: Robust error boundaries and graceful degradation
- **Performance**: Optimized rendering and memory management for large documents
- **Testing**: Comprehensive test coverage with automated validation

### File System Enhancements
```typescript
// Enhanced image URL transformation
const transformedSrc = `http://localhost:3001/api/notebook-files/${documentId}/${src}`;

// Visual error handling for failed images
onerror="console.error('Failed to load image:', this.src); this.style.border='2px solid red'; this.style.padding='10px';"
```

### Server-Side Improvements
```javascript
// Symbolic link resolution in server
if (fs.lstatSync(directoryPath).isSymbolicLink()) {
  resolvedPath = fs.readlinkSync(directoryPath);
  if (!path.isAbsolute(resolvedPath)) {
    resolvedPath = path.resolve(path.dirname(directoryPath), resolvedPath);
  }
  console.log(`Resolved symbolic link: ${directoryPath} -> ${resolvedPath}`);
}
```

### Development Environment
- **VS Code Extensions**: Curated list of recommended extensions for optimal development experience
- **DevContainer Support**: GitHub Codespaces configuration for instant cloud development
- **Python Environment**: Consistent Python package management with requirements.txt
- **Cross-Platform**: Full support for macOS, Windows, and Linux development

## Future Enhancements

### Version 1.1 Features
- **Custom Page Sizes**: User-defined page dimensions
- **Page Templates**: Pre-designed layouts for common use cases
- **Enhanced Export**: PDF export with layout preservation
- **Collaborative Editing**: Real-time collaboration support

### Version 1.2 Features
- **Plugin System**: Custom cell types and extensions
- **Cloud Integration**: Google Drive, Dropbox integration
- **Mobile Support**: Responsive design for tablets
- **Advanced Layouts**: Multi-column layouts, sections

## Learning Objectives

### Key Specification Elements
1. **Clear Architecture**: Separation of concerns between frontend/backend
2. **Detailed Component Design**: Specific interfaces and implementation details
3. **Critical Features**: In-depth coverage of complex features (output scrolling, magic commands)
4. **Technical Constraints**: Performance, security, and compatibility requirements
5. **Quality Standards**: Testing, deployment, and maintenance considerations

### Important Specification Practices
- **User-Centric Design**: Features driven by user needs and workflows
- **Technical Feasibility**: Realistic implementation approaches
- **Extensibility**: Architecture that supports future enhancements
- **Compatibility**: Integration with existing ecosystems (Jupyter)
- **Performance Considerations**: Scalability and responsiveness requirements

This specification provides a complete blueprint for building a sophisticated visual notebook editor that maintains compatibility with the Jupyter ecosystem while providing a superior user experience through innovative UI/UX design and robust technical implementation.
