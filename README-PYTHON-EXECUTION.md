# Design Diary - Python Code Execution

This document describes the Python code execution feature that has been added to the Design Diary prototype.

## Overview

The Design Diary now supports real Python code execution using your local Anaconda environment. Code cells can execute Python code and display results directly in the interface.

## Architecture

### Backend Server
- **Location**: `server/server.js`
- **Port**: 3001
- **Technology**: Node.js with Express
- **Python Integration**: Uses `child_process.spawn()` to execute Python code
- **Environment**: Automatically detects and uses your Anaconda Python installation

### Frontend Integration
- **Service**: `src/services/pythonExecutionService.ts` - Handles API communication
- **Store**: Updated `src/store/useStore.ts` - Manages execution state
- **UI**: Enhanced `src/components/Cell/CodeCell.tsx` - Displays results and execution controls

## Features

### Code Execution
- **Run Button**: Each code cell has a "Run" button in the top-right corner
- **Real-time Status**: Button shows "Running..." during execution
- **Output Display**: Results appear below the code editor
- **Error Handling**: Errors are displayed with red styling
- **Success Indication**: Successful executions show with green styling

### Python Environment
- **Anaconda Integration**: Automatically finds and uses your Anaconda Python
- **Environment Variables**: Preserves your current conda environment
- **Package Access**: Full access to installed Python packages
- **Working Directory**: Executes in a temporary directory

### Security & Performance
- **Timeout Protection**: 30-second execution timeout
- **Temporary Files**: Code is written to temporary files and cleaned up
- **Session Management**: Each execution gets a unique session ID
- **Error Isolation**: Execution errors don't crash the application

## Usage

### Starting the Application
```bash
# Option 1: Use the startup script (recommended)
./start-dev.sh

# Option 2: Start manually
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend  
npm start
```

### Running Python Code
1. Create a new Code cell using the toolbar
2. Write your Python code in the Monaco editor
3. Click the "Run" button in the top-right corner
4. View results in the output area below the code

### Example Code
```python
# Basic Python execution
print("Hello from Design Diary!")
import numpy as np
arr = np.array([1, 2, 3, 4, 5])
print(f"Array: {arr}")
print(f"Mean: {arr.mean()}")
```

## API Endpoints

### POST /api/execute
Execute Python code
- **Body**: `{ code: string, cellId: string }`
- **Response**: `{ cellId, sessionId, exitCode, stdout, stderr, success, timestamp }`

### GET /api/health
Check server health and Python executable
- **Response**: `{ status, pythonExecutable, timestamp }`

### GET /api/python-info
Get Python version and executable info
- **Response**: `{ version, executable, success }`

## File Structure
```
design-diary-prototype/
├── server/
│   ├── package.json          # Backend dependencies
│   └── server.js             # Express server with Python execution
├── src/
│   ├── services/
│   │   └── pythonExecutionService.ts  # API client
│   ├── store/
│   │   └── useStore.ts       # Updated with execution logic
│   ├── components/Cell/
│   │   └── CodeCell.tsx      # Enhanced with execution UI
│   └── types/
│       └── index.ts          # Updated with execution types
├── start-dev.sh              # Development startup script
└── README-PYTHON-EXECUTION.md # This file
```

## Troubleshooting

### Python Not Found
If you get "Python executable not found" errors:
1. Ensure Anaconda is installed and in your PATH
2. Activate your desired conda environment before starting
3. Check the server logs for the detected Python path

### Execution Timeouts
- Default timeout is 30 seconds
- Long-running code will be terminated
- Consider breaking complex operations into smaller cells

### Package Import Errors
- Ensure required packages are installed in your active conda environment
- Use `conda install package-name` or `pip install package-name`

### Port Conflicts
- Backend runs on port 3001, frontend on port 3000
- Ensure these ports are available
- Modify `pythonExecutionService.ts` if you need different ports

## Next Steps

This implementation provides a solid foundation for Python execution. Future enhancements could include:

1. **Multi-language Support**: Add support for R, Julia, JavaScript
2. **Variable Persistence**: Share variables between cell executions
3. **Plot Integration**: Display matplotlib/plotly charts inline
4. **Package Management**: Built-in package installer
5. **Execution History**: Track and replay execution sequences
6. **Collaborative Features**: Share executable notebooks

## Development Notes

- The server automatically detects your Anaconda installation
- Temporary files are created in the system temp directory
- Each execution is isolated in its own Python process
- Session cleanup happens automatically after 1 hour
- All execution results are stored temporarily for debugging
