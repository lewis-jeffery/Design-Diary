# Design Diary - Visual Jupyter Notebook Editor

A modern, visual interface for creating and editing Jupyter notebooks with a canvas-based approach. Design Diary transforms the traditional linear notebook experience into a flexible, multi-page document editor that maintains full compatibility with the Jupyter ecosystem.

![Design Diary Screenshot](docs/screenshot.png)

## 🌟 Features

### 📄 Multi-Page Canvas System
- **Professional Layout**: Structured pages with standard paper sizes (A4, A3, A5, Letter, Legal, Tabloid)
- **Flexible Orientation**: Portrait and landscape modes with single-click switching
- **Document-Like Experience**: Clean white pages with shadows for professional appearance
- **Automatic Page Management**: New pages created automatically as content grows

### 🧮 Rich Cell Types
- **Code Cells**: Full Python execution with syntax highlighting and output display
- **Text Cells**: Rich markdown editing with live preview
- **Equation Cells**: LaTeX math rendering with MathJax
- **Image Cells**: Image embedding and display
- **Graph Cells**: Data visualization support

### 🔧 Advanced Editing
- **Visual Positioning**: Drag and drop cells anywhere on the canvas
- **Flexible Sizing**: Resize cells to fit content perfectly
- **Grid Snapping**: Optional grid alignment for precise layouts
- **Zoom Controls**: Scale the entire canvas for detailed work or overview

### 🔄 Jupyter Compatibility
- **Full Import/Export**: Seamless .ipynb file support
- **Layout Preservation**: Custom .layout.json files maintain visual arrangements
- **Standard Compliance**: Generated notebooks work in any Jupyter environment
- **Execution History**: Maintains cell execution order and state

### 🚀 Python Execution
- **Local Server**: Built-in Python execution server
- **Real-time Output**: Live code execution with immediate results
- **Error Handling**: Clear error messages and debugging support
- **Rich Output**: Support for plots, images, and formatted data

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **npm** or **yarn**
- **Git** (for version control and synchronization)

### New Machine Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/lewis-jeffery/design-diary.git
   cd design-diary
   ```

2. **Automated setup (Recommended)**
   ```bash
   # Run the complete setup script
   ./setup-new-machine.sh
   ```
   This script will:
   - Install all Node.js and Python dependencies
   - Set up Python virtual environment
   - Configure executable permissions
   - Create environment template
   - Validate the installation

3. **Manual setup (Alternative)**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install Python server dependencies
   cd server
   npm install
   pip install -r requirements.txt
   cd ..
   
   # Make scripts executable
   chmod +x *.sh
   ```

4. **Start the application**
   ```bash
   # Option 1: Use sync-aware startup (Recommended)
   ./sync-start.sh
   
   # Option 2: Simple startup
   ./start-dev.sh
   
   # Option 3: Manual startup
   # Terminal 1 - Start Python execution server
   cd server && npm start
   
   # Terminal 2 - Start React frontend
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Multi-Machine Development

For seamless development across multiple machines:

```bash
# Daily workflow - Starting work
./sync-start.sh  # Pulls latest changes and starts application

# Daily workflow - Ending work  
./sync-end.sh    # Saves work and pushes changes
```

See [SYNC-QUICK-START.md](SYNC-QUICK-START.md) for complete synchronization setup.

### Shutting Down and Restarting

Design Diary provides multiple ways to gracefully shut down and restart the application:

#### **Shutting Down**

1. **Using the Quit Button**: Click the red "🚪 Quit" button in the toolbar
   - Automatically saves unsaved work (with confirmation)
   - Gracefully shuts down both frontend and backend servers
   - Cleans up temporary files and Python sessions

2. **Using the Cleanup Script**: Run the cleanup script from the command line
   ```bash
   ./cleanup.sh
   ```
   - Detects and terminates all Design Diary processes on ports 3000 and 3001
   - Cleans up all temporary files and processes
   - Safe to use even if servers are unresponsive
   - Provides detailed feedback on what was cleaned up

3. **Manual Shutdown**: Use Ctrl+C in the terminal running `./start-dev.sh`
   - Servers will attempt graceful shutdown
   - May require running `./cleanup.sh` for complete cleanup

#### **Restarting**

1. **Using the Restart Script**: For a complete restart
   ```bash
   ./restart.sh
   ```
   - Automatically runs cleanup first
   - Starts both backend and frontend servers
   - Provides process IDs and status information
   - Shows URLs for accessing the application

2. **Manual Restart**: After cleanup
   ```bash
   # After running ./cleanup.sh
   cd server && npm start &  # Start backend
   npm start                 # Start frontend
   ```

#### **Troubleshooting Port Issues**

If you get "port already in use" errors:
```bash
# Clean up any stuck processes
./cleanup.sh

# Wait a moment, then restart
./restart.sh
```

The cleanup script will forcefully terminate any processes using ports 3000 or 3001, ensuring a clean restart.

## 📖 Usage Guide

### Creating Your First Document

1. **Start with a New Document**: Click the "📄 New" button in the toolbar
2. **Add Cells**: Use the toolbar buttons to add different cell types:
   - **📝 Code**: For Python code execution
   - **📄 Text**: For markdown text and documentation
   - **🖼️ Image**: For embedding images
   - **🧮 Equation**: For mathematical expressions
   - **📊 Graph**: For data visualizations

3. **Position and Resize**: Drag cells to position them, resize using corner handles
4. **Configure Pages**: Use the page size dropdown and orientation toggle
5. **Save Your Work**: Use "Save As..." to export as .ipynb and .layout.json files

### Working with Code Cells

```python
# Example: Create a simple plot
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(8, 4))
plt.plot(x, y)
plt.title('Sine Wave')
plt.show()
```

### Page Configuration

- **Page Sizes**: Choose from A4, A3, A5, Letter, Legal, or Tabloid
- **Orientation**: Switch between portrait and landscape
- **Grid Alignment**: Toggle grid snapping for precise positioning
- **Zoom**: Use zoom controls for detailed editing or overview

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and developer experience
- **Styled Components**: CSS-in-JS styling with theming
- **Zustand**: Lightweight state management
- **Monaco Editor**: VS Code-quality code editing
- **MathJax**: Mathematical expression rendering

### Backend (Node.js + Python)
- **Express Server**: RESTful API for Python execution
- **Python Integration**: Subprocess-based code execution
- **Error Handling**: Comprehensive error capture and reporting
- **Output Processing**: Rich output formatting and display

### File Structure
```
design-diary/
├── src/                    # React frontend source
│   ├── components/         # React components
│   ├── services/          # API and utility services
│   ├── store/             # State management
│   └── types/             # TypeScript definitions
├── server/                # Python execution server
├── public/                # Static assets
├── docs/                  # Documentation and screenshots
└── README.md             # This file
```

## 🔧 Development

### Running in Development Mode

```bash
# Start both frontend and backend
./start-dev.sh

# Or start individually:
# Backend (Terminal 1)
cd server && npm run dev

# Frontend (Terminal 2)
npm start
```

### Building for Production

```bash
# Build the React app
npm run build

# The built files will be in the 'build' directory
```

### Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd server && npm test
```

## 📚 Documentation

- **[Multi-Page Canvas System](README-MULTI-PAGE-CANVAS.md)**: Detailed guide to the page-based layout system
- **[Jupyter Integration](README-JUPYTER-INTEGRATION.md)**: How Design Diary works with Jupyter notebooks
- **[Python Execution](README-PYTHON-EXECUTION.md)**: Understanding the code execution system
- **[Rich Output Support](README-RICH-OUTPUT.md)**: Working with plots, images, and formatted output
- **[Jupyter Compatibility](README-JUPYTER-COMPATIBILITY.md)**: Compatibility details and limitations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Jupyter Project**: For the notebook format and ecosystem
- **React Team**: For the excellent frontend framework
- **Monaco Editor**: For the VS Code-quality editing experience
- **MathJax**: For beautiful mathematical rendering

## 🐛 Issues and Support

- **Bug Reports**: Please use the [GitHub Issues](https://github.com/your-username/design-diary/issues) page
- **Feature Requests**: We'd love to hear your ideas!
- **Questions**: Check the documentation or open a discussion

## 🗺️ Roadmap

### Version 1.1 (Planned)
- [ ] Custom page sizes and margins
- [ ] Page templates and themes
- [ ] Collaborative editing support
- [ ] Enhanced export options (PDF, HTML)

### Version 1.2 (Future)
- [ ] Plugin system for custom cell types
- [ ] Advanced layout tools
- [ ] Integration with cloud storage
- [ ] Mobile-responsive design

---

**Design Diary** - Transforming how you create and share computational documents.
