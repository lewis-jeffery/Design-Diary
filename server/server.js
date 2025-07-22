const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store for managing execution sessions and persistent Python processes
const executionSessions = new Map();
const persistentSessions = new Map(); // Map of document/notebook sessions to Python processes
const notebookWorkingDirectories = new Map(); // Map of document IDs to their working directories

// Create temp directory for Python files and outputs
const tempDir = path.join(os.tmpdir(), 'design-diary-python');
const outputDir = path.join(tempDir, 'outputs');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Serve static files from output directory
app.use('/api/outputs', express.static(outputDir));

// Serve static files from notebook working directories
app.use('/api/notebook-files/:documentId/*', (req, res) => {
  const { documentId } = req.params;
  const filePath = req.params[0]; // Everything after documentId/
  
  const workingDir = notebookWorkingDirectories.get(documentId);
  if (!workingDir) {
    return res.status(404).json({ error: 'Notebook working directory not found' });
  }
  
  // Check if this is a directory handle placeholder
  if (workingDir.startsWith('__DIRECTORY_HANDLE__')) {
    // This means the frontend will handle file serving via File System Access API
    return res.status(200).json({ 
      useDirectoryHandle: true,
      documentId: documentId,
      filePath: filePath
    });
  }
  
  const fullPath = path.join(workingDir, filePath);
  
  // Security check: ensure the requested file is within the working directory
  const resolvedPath = path.resolve(fullPath);
  const resolvedWorkingDir = path.resolve(workingDir);
  
  if (!resolvedPath.startsWith(resolvedWorkingDir)) {
    return res.status(403).json({ error: 'Access denied: file outside working directory' });
  }
  
  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Serve the file
  res.sendFile(resolvedPath);
});

// Function to find conda/python executable and get shell environment
function findPythonExecutable() {
  // Try to find conda python first
  const condaPath = process.env.CONDA_PREFIX;
  if (condaPath) {
    const condaPython = path.join(condaPath, 'bin', 'python');
    if (fs.existsSync(condaPython)) {
      return condaPython;
    }
  }
  
  // Try common conda locations
  const possiblePaths = [
    '/opt/anaconda3/bin/python',
    '/usr/local/anaconda3/bin/python',
    '/home/anaconda3/bin/python',
    path.join(os.homedir(), 'anaconda3', 'bin', 'python'),
    path.join(os.homedir(), 'miniconda3', 'bin', 'python'),
  ];
  
  for (const pythonPath of possiblePaths) {
    if (fs.existsSync(pythonPath)) {
      return pythonPath;
    }
  }
  
  // Fallback to system python
  return 'python3';
}

// Function to get shell environment with .zshrc sourced
function getShellEnvironment() {
  try {
    const { execSync } = require('child_process');
    const homeDir = os.homedir();
    const zshrcPath = path.join(homeDir, '.zshrc');
    
    // Source .zshrc and export environment variables
    const envOutput = execSync(`/bin/zsh -c "source ${zshrcPath} 2>/dev/null; env"`, {
      encoding: 'utf8',
      timeout: 5000
    });
    
    const env = { ...process.env };
    
    // Parse environment variables from shell output
    envOutput.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        env[key] = value;
      }
    });
    
    console.log('Shell environment loaded with PYTHONPATH:', env.PYTHONPATH);
    return env;
    
  } catch (error) {
    console.warn('Failed to load shell environment, using default:', error.message);
    return process.env;
  }
}

const PYTHON_EXECUTABLE = findPythonExecutable();
const SHELL_ENV = getShellEnvironment();

// Persistent Python session runner for maintaining variable context
const PERSISTENT_PYTHON_RUNNER = `
import sys
import os
import json
import base64
import io
import traceback
import re
from contextlib import redirect_stdout, redirect_stderr
import threading
import queue
import time

# Setup matplotlib for non-interactive backend
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# Global variables for session management
_output_dir = sys.argv[1] if len(sys.argv) > 1 else None
_session_globals = {}  # Persistent global namespace for variables
_cell_outputs = {}  # Track outputs per cell for clearing

# IPython magic commands support
def handle_magic_commands(code):
    """Process IPython magic commands and return cleaned code"""
    lines = code.split('\\n')
    cleaned_lines = []
    in_cell_magic = False
    
    for line in lines:
        stripped = line.strip()
        
        # Handle cell magics (%%magic)
        if stripped.startswith('%%'):
            in_cell_magic = True
            continue
        elif in_cell_magic and not stripped.startswith('%'):
            # Skip lines that are part of a cell magic block
            continue
        elif in_cell_magic and stripped.startswith('%'):
            # End of cell magic block
            in_cell_magic = False
            continue
        
        # Handle line magics (%magic)
        if stripped.startswith('%'):
            # Skip all line magics including %matplotlib inline
            continue
        else:
            cleaned_lines.append(line)
    
    return '\\n'.join(cleaned_lines)

def capture_output(data, output_type='text', metadata=None):
    """Capture rich output data"""
    return {
        'type': output_type,
        'data': data,
        'metadata': metadata or {}
    }

def save_matplotlib_figure(fig, filename):
    """Save matplotlib figure and return path"""
    global _output_dir
    if not _output_dir:
        return None
    
    filepath = os.path.join(_output_dir, filename)
    fig.savefig(filepath, format='png', dpi=100, bbox_inches='tight')
    return filename

def execute_code_block(code, execution_id):
    """Execute a code block and return results"""
    global _session_globals, _cell_outputs
    
    # Extract cell ID from execution_id for output tracking
    cell_id = execution_id.split('_')[0] if '_' in execution_id else execution_id
    
    # Clear previous outputs for this cell
    if cell_id in _cell_outputs:
        # Clean up old image files
        for old_output in _cell_outputs[cell_id]:
            if old_output.get('type') == 'image' and old_output.get('data'):
                old_file_path = os.path.join(_output_dir, old_output['data'])
                try:
                    if os.path.exists(old_file_path):
                        os.remove(old_file_path)
                except Exception:
                    pass
    
    outputs = []
    _cell_outputs[cell_id] = outputs  # Track outputs for this cell
    
    # Process magic commands
    cleaned_code = handle_magic_commands(code)
    
    # Skip execution if code is empty after magic processing
    if not cleaned_code.strip():
        return {
            'stdout': '',
            'stderr': '',
            'outputs': outputs
        }
    
    # Clear any existing matplotlib figures before execution
    if HAS_MATPLOTLIB:
        plt.close('all')
    
    # Override plt.show to capture figures
    if HAS_MATPLOTLIB:
        original_show = plt.show
        def custom_show(*args, **kwargs):
            fig = plt.gcf()
            if fig.get_axes():  # Only save if figure has content
                filename = f"plot_{cell_id}_{len(outputs)}.png"
                saved_path = save_matplotlib_figure(fig, filename)
                if saved_path:
                    output_data = capture_output(saved_path, 'image', {
                        'width': fig.get_figwidth() * fig.dpi,
                        'height': fig.get_figheight() * fig.dpi,
                        'mimeType': 'image/png'
                    })
                    outputs.append(output_data)
            plt.close()  # Close the figure to free memory
        
        plt.show = custom_show
    
    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    try:
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            # Execute the cleaned user code in the persistent global namespace
            exec(cleaned_code, _session_globals)
            
            # Auto-capture any remaining matplotlib figures that weren't shown explicitly
            if HAS_MATPLOTLIB and plt.get_fignums():
                for fig_num in plt.get_fignums():
                    fig = plt.figure(fig_num)
                    if fig.get_axes():
                        filename = f"plot_{cell_id}_{len(outputs)}.png"
                        saved_path = save_matplotlib_figure(fig, filename)
                        if saved_path:
                            output_data = capture_output(saved_path, 'image', {
                                'width': fig.get_figwidth() * fig.dpi,
                                'height': fig.get_figheight() * fig.dpi,
                                'mimeType': 'image/png'
                            })
                            outputs.append(output_data)
                    plt.close(fig)
    
    except Exception as e:
        # Capture the exception
        error_msg = traceback.format_exc()
        stderr_capture.write(error_msg)
    
    # Restore original plt.show if it was overridden
    if HAS_MATPLOTLIB:
        plt.show = original_show
    
    return {
        'stdout': stdout_capture.getvalue(),
        'stderr': stderr_capture.getvalue(),
        'outputs': outputs
    }

# Main execution loop - wait for commands from stdin
print("PYTHON_SESSION_READY")
sys.stdout.flush()

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            break
            
        line = line.strip()
        if line == "EXIT":
            break
            
        if line.startswith("EXECUTE:"):
            # Parse execution request
            request_data = json.loads(line[8:])  # Remove "EXECUTE:" prefix
            execution_id = request_data.get('execution_id', 'unknown')
            code = request_data.get('code', '')
            
            # Execute the code
            result = execute_code_block(code, execution_id)
            
            # Send result back
            response = {
                'execution_id': execution_id,
                'result': result
            }
            
            print("RESULT:" + json.dumps(response))
            sys.stdout.flush()
            
    except Exception as e:
        error_response = {
            'execution_id': 'unknown',
            'result': {
                'stdout': '',
                'stderr': f'Session error: {str(e)}',
                'outputs': []
            }
        }
        print("RESULT:" + json.dumps(error_response))
        sys.stdout.flush()
`;

// Function to get or create a persistent Python session
function getOrCreatePersistentSession(documentId = 'default') {
  if (persistentSessions.has(documentId)) {
    return persistentSessions.get(documentId);
  }
  
  // Create new persistent session
  const runnerFile = path.join(tempDir, `persistent_runner_${documentId}.py`);
  fs.writeFileSync(runnerFile, PERSISTENT_PYTHON_RUNNER);
  
  const pythonProcess = spawn(PYTHON_EXECUTABLE, [runnerFile, outputDir], {
    cwd: tempDir,
    env: SHELL_ENV
  });
  
  const session = {
    process: pythonProcess,
    documentId,
    pendingExecutions: new Map(),
    isReady: false,
    lastActivity: Date.now()
  };
  
  // Handle process output
  pythonProcess.stdout.on('data', (data) => {
    const output = data.toString();
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.trim() === 'PYTHON_SESSION_READY') {
        session.isReady = true;
        console.log(`Python session ready for document: ${documentId}`);
      } else if (line.startsWith('RESULT:')) {
        try {
          const resultData = JSON.parse(line.substring(7));
          const executionId = resultData.execution_id;
          
          if (session.pendingExecutions.has(executionId)) {
            const { resolve } = session.pendingExecutions.get(executionId);
            session.pendingExecutions.delete(executionId);
            resolve(resultData.result);
          }
        } catch (err) {
          console.error('Failed to parse execution result:', err);
        }
      }
    }
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python session error (${documentId}):`, data.toString());
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python session closed for document ${documentId} with code ${code}`);
    persistentSessions.delete(documentId);
    
    // Reject any pending executions
    for (const [executionId, { reject }] of session.pendingExecutions) {
      reject(new Error('Python session closed unexpectedly'));
    }
    session.pendingExecutions.clear();
  });
  
  pythonProcess.on('error', (err) => {
    console.error(`Python session error for document ${documentId}:`, err);
    persistentSessions.delete(documentId);
    
    // Reject any pending executions
    for (const [executionId, { reject }] of session.pendingExecutions) {
      reject(err);
    }
    session.pendingExecutions.clear();
  });
  
  persistentSessions.set(documentId, session);
  
  // Clean up temp file after a delay
  setTimeout(() => {
    try {
      fs.unlinkSync(runnerFile);
    } catch (err) {
      console.warn('Failed to clean up runner file:', err.message);
    }
  }, 5000);
  
  return session;
}

// Function to execute code in a persistent session
function executeInPersistentSession(session, code, executionId) {
  return new Promise((resolve, reject) => {
    if (!session.isReady) {
      reject(new Error('Python session not ready'));
      return;
    }
    
    // Store the promise resolvers
    session.pendingExecutions.set(executionId, { resolve, reject });
    session.lastActivity = Date.now();
    
    // Send execution request
    const request = {
      execution_id: executionId,
      code: code
    };
    
    try {
      session.process.stdin.write(`EXECUTE:${JSON.stringify(request)}\n`);
    } catch (err) {
      session.pendingExecutions.delete(executionId);
      reject(err);
    }
    
    // Set timeout for execution
    setTimeout(() => {
      if (session.pendingExecutions.has(executionId)) {
        session.pendingExecutions.delete(executionId);
        reject(new Error('Execution timeout (30 seconds)'));
      }
    }, 30000);
  });
}

// Execute Python code endpoint with persistent session support
app.post('/api/execute', async (req, res) => {
  const { code, cellId, documentId = 'default' } = req.body;
  
  if (!code || !cellId) {
    return res.status(400).json({ 
      error: 'Missing required fields: code and cellId' 
    });
  }

  const sessionId = uuidv4();
  const executionId = `${cellId}_${sessionId}`;
  
  try {
    // Get or create persistent session for this document
    const session = getOrCreatePersistentSession(documentId);
    
    // Wait for session to be ready (with timeout)
    const maxWaitTime = 5000; // 5 seconds
    const startTime = Date.now();
    
    while (!session.isReady && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!session.isReady) {
      return res.status(500).json({
        error: 'Python session failed to initialize',
        cellId,
        sessionId
      });
    }
    
    // Execute code in persistent session
    const result = await executeInPersistentSession(session, code, executionId);
    
    const response = {
      cellId,
      sessionId,
      exitCode: result.stderr ? 1 : 0,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
      outputs: result.outputs || [],
      success: !result.stderr.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Store result for potential future reference
    executionSessions.set(sessionId, response);
    
    res.json(response);
    
  } catch (err) {
    res.status(500).json({
      error: `Execution failed: ${err.message}`,
      cellId,
      sessionId
    });
  }
});

// Get execution result endpoint
app.get('/api/execution/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const result = executionSessions.get(sessionId);
  
  if (!result) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(result);
});

// Server-side file operations endpoints

// List files in a directory
app.post('/api/list-directory', (req, res) => {
  const { directoryPath } = req.body;
  
  if (!directoryPath) {
    return res.status(400).json({ error: 'Missing directoryPath' });
  }
  
  try {
    let resolvedPath = directoryPath;
    
    // Check if the path is a symbolic link and resolve it
    if (fs.existsSync(directoryPath)) {
      const stats = fs.lstatSync(directoryPath);
      if (stats.isSymbolicLink()) {
        resolvedPath = fs.readlinkSync(directoryPath);
        // Handle relative symbolic links
        if (!path.isAbsolute(resolvedPath)) {
          resolvedPath = path.resolve(path.dirname(directoryPath), resolvedPath);
        }
        console.log(`Resolved symbolic link: ${directoryPath} -> ${resolvedPath}`);
      }
    }
    
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Directory does not exist' });
    }
    
    // Check if we have read permissions
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch (permError) {
      if (permError.code === 'EPERM' || permError.code === 'EACCES') {
        // Provide specific guidance for CloudStorage/Dropbox access
        let errorMessage = 'Permission denied: Cannot access this directory';
        let helpMessage = '';
        
        if (resolvedPath.includes('CloudStorage') || directoryPath.includes('Dropbox')) {
          helpMessage = 'This appears to be a Dropbox/CloudStorage directory. You may need to grant Full Disk Access to Terminal or VS Code in System Preferences → Security & Privacy → Privacy → Full Disk Access.';
        }
        
        return res.status(403).json({ 
          error: errorMessage,
          help: helpMessage,
          code: permError.code,
          path: directoryPath,
          resolvedPath: resolvedPath !== directoryPath ? resolvedPath : undefined
        });
      }
      throw permError;
    }
    
    const files = fs.readdirSync(resolvedPath);
    const fileList = [];
    
    // Process each file individually to handle permission errors gracefully
    for (const filename of files) {
      try {
        const filePath = path.join(resolvedPath, filename);
        const stats = fs.statSync(filePath);
        fileList.push({
          name: filename,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        });
      } catch (fileError) {
        // Skip files we can't access but log the issue
        console.warn(`Skipping file ${filename}: ${fileError.message}`);
        // Optionally include inaccessible files with limited info
        if (fileError.code !== 'EPERM' && fileError.code !== 'EACCES') {
          fileList.push({
            name: filename,
            path: path.join(resolvedPath, filename),
            isDirectory: false,
            size: 0,
            modified: new Date(),
            error: 'Access denied'
          });
        }
      }
    }
    
    res.json({ 
      files: fileList, 
      directoryPath: resolvedPath,
      originalPath: directoryPath !== resolvedPath ? directoryPath : undefined
    });
  } catch (error) {
    // Handle different types of errors with appropriate status codes
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      let errorMessage = 'Permission denied: Cannot access this directory';
      let helpMessage = '';
      
      if (directoryPath.includes('CloudStorage') || directoryPath.includes('Dropbox')) {
        helpMessage = 'This appears to be a Dropbox/CloudStorage directory. You may need to grant Full Disk Access to Terminal or VS Code in System Preferences → Security & Privacy → Privacy → Full Disk Access.';
      }
      
      res.status(403).json({ 
        error: errorMessage,
        help: helpMessage,
        code: error.code,
        path: directoryPath
      });
    } else if (error.code === 'ENOENT') {
      res.status(404).json({ 
        error: 'Directory not found',
        code: error.code,
        path: directoryPath
      });
    } else if (error.code === 'ENOTDIR') {
      res.status(400).json({ 
        error: 'Path is not a directory',
        code: error.code,
        path: directoryPath
      });
    } else {
      res.status(500).json({ 
        error: `Failed to read directory: ${error.message}`,
        code: error.code || 'UNKNOWN',
        path: directoryPath
      });
    }
  }
});

// Read a file from the server filesystem
app.post('/api/read-file', (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Missing filePath' });
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File does not exist' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    res.json({ 
      content,
      filePath,
      size: stats.size,
      modified: stats.mtime
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to read file: ${error.message}` });
  }
});

// Write a file to the server filesystem
app.post('/api/write-file', (req, res) => {
  const { filePath, content } = req.body;
  
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Missing filePath or content' });
  }
  
  try {
    // Ensure directory exists
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    const stats = fs.statSync(filePath);
    
    console.log(`File written: ${filePath} (${stats.size} bytes)`);
    
    res.json({ 
      success: true,
      filePath,
      size: stats.size,
      modified: stats.mtime
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to write file: ${error.message}` });
  }
});

// Import notebook from server filesystem
app.post('/api/import-notebook', (req, res) => {
  const { notebookPath } = req.body;
  
  if (!notebookPath) {
    return res.status(400).json({ error: 'Missing notebookPath' });
  }
  
  try {
    if (!fs.existsSync(notebookPath)) {
      return res.status(404).json({ error: 'Notebook file does not exist' });
    }
    
    // Read the notebook file
    const notebookContent = fs.readFileSync(notebookPath, 'utf8');
    const notebook = JSON.parse(notebookContent);
    
    // Get the directory containing the notebook
    const notebookDirectory = path.dirname(notebookPath);
    const notebookFilename = path.basename(notebookPath, '.ipynb');
    
    // Look for a matching layout file
    const layoutPath = path.join(notebookDirectory, `${notebookFilename}.layout.json`);
    let layout = null;
    
    if (fs.existsSync(layoutPath)) {
      console.log(`Found layout file: ${layoutPath}`);
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');
      layout = JSON.parse(layoutContent);
    }
    
    // Register the notebook directory for image serving
    const documentId = notebook.metadata?.design_diary?.id || `imported-notebook-${Date.now()}`;
    notebookWorkingDirectories.set(documentId, notebookDirectory);
    
    console.log(`Imported notebook: ${notebookPath}`);
    console.log(`Registered working directory: ${notebookDirectory}`);
    
    res.json({
      notebook,
      layout,
      documentId,
      notebookPath,
      notebookDirectory,
      hasLayout: layout !== null
    });
    
  } catch (error) {
    res.status(500).json({ error: `Failed to import notebook: ${error.message}` });
  }
});

// Save notebook and layout to server filesystem
app.post('/api/save-notebook', (req, res) => {
  const { notebookPath, notebookContent, layoutContent, silent = false } = req.body;
  
  if (!notebookPath || !notebookContent) {
    return res.status(400).json({ error: 'Missing notebookPath or notebookContent' });
  }
  
  try {
    // Ensure directory exists
    const directory = path.dirname(notebookPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Write notebook file
    fs.writeFileSync(notebookPath, notebookContent, 'utf8');
    const notebookStats = fs.statSync(notebookPath);
    
    // Write layout file if provided
    let layoutStats = null;
    let layoutPath = null;
    if (layoutContent) {
      const notebookFilename = path.basename(notebookPath, '.ipynb');
      layoutPath = path.join(directory, `${notebookFilename}.layout.json`);
      fs.writeFileSync(layoutPath, layoutContent, 'utf8');
      layoutStats = fs.statSync(layoutPath);
    }
    
    if (!silent) {
      console.log(`Saved notebook: ${notebookPath} (${notebookStats.size} bytes)`);
      if (layoutPath) {
        console.log(`Saved layout: ${layoutPath} (${layoutStats.size} bytes)`);
      }
    }
    
    res.json({
      success: true,
      notebookPath,
      layoutPath,
      notebookSize: notebookStats.size,
      layoutSize: layoutStats ? layoutStats.size : 0,
      modified: notebookStats.mtime
    });
    
  } catch (error) {
    res.status(500).json({ error: `Failed to save notebook: ${error.message}` });
  }
});

// Save PDF to server filesystem
app.post('/api/save-pdf', (req, res) => {
  const { pdfPath, pdfData } = req.body;
  
  if (!pdfPath || !pdfData) {
    return res.status(400).json({ error: 'Missing pdfPath or pdfData' });
  }
  
  try {
    // Ensure directory exists
    const directory = path.dirname(pdfPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // Convert base64 string back to binary data
    const pdfBuffer = Buffer.from(pdfData, 'base64');
    
    // Write PDF file
    fs.writeFileSync(pdfPath, pdfBuffer);
    const pdfStats = fs.statSync(pdfPath);
    
    console.log(`Saved PDF: ${pdfPath} (${pdfStats.size} bytes)`);
    
    res.json({
      success: true,
      savedPath: pdfPath,
      size: pdfStats.size,
      modified: pdfStats.mtime
    });
    
  } catch (error) {
    res.status(500).json({ error: `Failed to save PDF: ${error.message}` });
  }
});

// Register notebook working directory endpoint (legacy support)
app.post('/api/register-working-directory', (req, res) => {
  const { documentId, workingDirectory } = req.body;
  
  if (!documentId || !workingDirectory) {
    return res.status(400).json({ 
      error: 'Missing required fields: documentId and workingDirectory' 
    });
  }
  
  // Validate that the directory exists
  if (!fs.existsSync(workingDirectory)) {
    return res.status(400).json({ 
      error: 'Working directory does not exist' 
    });
  }
  
  // Store the working directory for this document
  notebookWorkingDirectories.set(documentId, workingDirectory);
  
  console.log(`Registered working directory for document ${documentId}: ${workingDirectory}`);
  
  res.json({ 
    success: true,
    documentId,
    workingDirectory,
    message: 'Working directory registered successfully'
  });
});

// Get registered working directory endpoint
app.get('/api/working-directory/:documentId', (req, res) => {
  const { documentId } = req.params;
  const workingDir = notebookWorkingDirectories.get(documentId);
  
  if (!workingDir) {
    return res.status(404).json({ error: 'Working directory not found for this document' });
  }
  
  res.json({
    documentId,
    workingDirectory: workingDir
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    pythonExecutable: PYTHON_EXECUTABLE,
    timestamp: new Date().toISOString()
  });
});

// Test Python installation endpoint
app.get('/api/python-info', async (req, res) => {
  try {
    const pythonProcess = spawn(PYTHON_EXECUTABLE, ['-c', 'import sys; print(sys.version); print(sys.executable); import matplotlib; print("matplotlib available")'], {
      env: SHELL_ENV
    });
    
    let output = '';
    let error = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        const lines = output.trim().split('\n');
        res.json({
          version: lines[0] || 'Unknown',
          executable: lines[1] || PYTHON_EXECUTABLE,
          matplotlib: lines[2] === 'matplotlib available',
          success: true
        });
      } else {
        res.status(500).json({
          error: error || 'Failed to get Python info',
          success: false
        });
      }
    });
    
  } catch (err) {
    res.status(500).json({
      error: `Failed to check Python: ${err.message}`,
      success: false
    });
  }
});

// Clean up old sessions and files periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  // Clean up execution sessions
  for (const [sessionId, result] of executionSessions.entries()) {
    const sessionTime = new Date(result.timestamp).getTime();
    if (now - sessionTime > maxAge) {
      executionSessions.delete(sessionId);
    }
  }
  
  // Clean up old output files
  try {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (err) {
    console.warn('Failed to clean up output files:', err.message);
  }
}, 10 * 60 * 1000); // Clean up every 10 minutes

// Recent files management endpoints
const RECENT_FILES_DIR = path.join(os.homedir(), '.jupyter', 'lab', 'user-settings', '@design-diary');
const RECENT_FILES_PATH = path.join(RECENT_FILES_DIR, 'recent-files.json');

// Ensure recent files directory exists
function ensureRecentFilesDir() {
  if (!fs.existsSync(RECENT_FILES_DIR)) {
    fs.mkdirSync(RECENT_FILES_DIR, { recursive: true });
    console.log(`Created recent files directory: ${RECENT_FILES_DIR}`);
  }
}

// Load recent files from disk
function loadRecentFiles() {
  try {
    ensureRecentFilesDir();
    if (fs.existsSync(RECENT_FILES_PATH)) {
      const content = fs.readFileSync(RECENT_FILES_PATH, 'utf8');
      const data = JSON.parse(content);
      
      // Validate structure
      if (Array.isArray(data)) {
        return data.filter(file => 
          file && 
          typeof file.path === 'string' && 
          typeof file.name === 'string' && 
          typeof file.lastOpened === 'string'
        );
      }
    }
  } catch (error) {
    console.warn('Failed to load recent files:', error.message);
  }
  return [];
}

// Save recent files to disk
function saveRecentFiles(recentFiles) {
  try {
    ensureRecentFilesDir();
    const content = JSON.stringify(recentFiles, null, 2);
    fs.writeFileSync(RECENT_FILES_PATH, content, 'utf8');
    console.log(`Saved ${recentFiles.length} recent files to ${RECENT_FILES_PATH}`);
    return true;
  } catch (error) {
    console.error('Failed to save recent files:', error.message);
    return false;
  }
}

// Get recent files endpoint
app.get('/api/recent-files', (req, res) => {
  try {
    const recentFiles = loadRecentFiles();
    res.json({ recentFiles });
  } catch (error) {
    res.status(500).json({ error: `Failed to load recent files: ${error.message}` });
  }
});

// Add recent file endpoint
app.post('/api/recent-files', (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Missing filePath' });
  }
  
  try {
    const recentFiles = loadRecentFiles();
    const fileName = path.basename(filePath);
    
    // Remove existing entry if it exists
    const filteredFiles = recentFiles.filter(file => file.path !== filePath);
    
    // Add new entry at the beginning
    const newRecentFile = {
      path: filePath,
      name: fileName,
      lastOpened: new Date().toISOString(),
    };
    
    // Keep only the last 10 recent files
    const updatedRecentFiles = [newRecentFile, ...filteredFiles].slice(0, 10);
    
    // Save to disk
    const success = saveRecentFiles(updatedRecentFiles);
    
    if (success) {
      res.json({ 
        success: true, 
        recentFiles: updatedRecentFiles,
        message: `Added ${fileName} to recent files`
      });
    } else {
      res.status(500).json({ error: 'Failed to save recent files' });
    }
    
  } catch (error) {
    res.status(500).json({ error: `Failed to add recent file: ${error.message}` });
  }
});

// Clear recent files endpoint
app.delete('/api/recent-files', (req, res) => {
  try {
    const success = saveRecentFiles([]);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Recent files cleared'
      });
    } else {
      res.status(500).json({ error: 'Failed to clear recent files' });
    }
    
  } catch (error) {
    res.status(500).json({ error: `Failed to clear recent files: ${error.message}` });
  }
});

// Remove specific recent file endpoint
app.delete('/api/recent-files/:encodedPath', (req, res) => {
  const { encodedPath } = req.params;
  
  try {
    const filePath = decodeURIComponent(encodedPath);
    const recentFiles = loadRecentFiles();
    
    // Remove the specified file
    const filteredFiles = recentFiles.filter(file => file.path !== filePath);
    
    const success = saveRecentFiles(filteredFiles);
    
    if (success) {
      res.json({ 
        success: true, 
        recentFiles: filteredFiles,
        message: `Removed ${path.basename(filePath)} from recent files`
      });
    } else {
      res.status(500).json({ error: 'Failed to save recent files' });
    }
    
  } catch (error) {
    res.status(500).json({ error: `Failed to remove recent file: ${error.message}` });
  }
});

// Graceful shutdown endpoint
app.post('/api/shutdown', (req, res) => {
  console.log('🔄 Shutdown request received');
  
  res.json({ 
    message: 'Shutdown initiated',
    timestamp: new Date().toISOString()
  });
  
  // Clean up persistent sessions
  console.log('🧹 Cleaning up Python sessions...');
  for (const [documentId, session] of persistentSessions.entries()) {
    try {
      session.process.stdin.write('EXIT\n');
      session.process.kill('SIGTERM');
      console.log(`✅ Closed Python session for document: ${documentId}`);
    } catch (err) {
      console.warn(`⚠️ Failed to close session ${documentId}:`, err.message);
    }
  }
  persistentSessions.clear();
  
  // Clean up execution sessions
  executionSessions.clear();
  
  // Clean up temp files
  try {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(outputDir, file));
      } catch (err) {
        console.warn(`⚠️ Failed to delete ${file}:`, err.message);
      }
    });
    console.log('🗑️ Cleaned up temporary files');
  } catch (err) {
    console.warn('⚠️ Failed to clean up output directory:', err.message);
  }
  
  console.log('✅ Cleanup complete, shutting down server...');
  
  // Give a moment for the response to be sent, then shutdown
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

const server = app.listen(PORT, () => {
  console.log(`Design Diary server running on port ${PORT}`);
  console.log(`Using Python executable: ${PYTHON_EXECUTABLE}`);
  console.log(`Output directory: ${outputDir}`);
});

// Handle graceful shutdown on process signals
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  
  // Clean up persistent sessions
  for (const [documentId, session] of persistentSessions.entries()) {
    try {
      session.process.stdin.write('EXIT\n');
      session.process.kill('SIGTERM');
    } catch (err) {
      console.warn(`Failed to close session ${documentId}:`, err.message);
    }
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  
  // Clean up persistent sessions
  for (const [documentId, session] of persistentSessions.entries()) {
    try {
      session.process.stdin.write('EXIT\n');
      session.process.kill('SIGTERM');
    } catch (err) {
      console.warn(`Failed to close session ${documentId}:`, err.message);
    }
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
