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
    global _session_globals
    
    outputs = []
    
    # Override plt.show to capture figures
    if HAS_MATPLOTLIB:
        original_show = plt.show
        def custom_show(*args, **kwargs):
            fig = plt.gcf()
            if fig.get_axes():  # Only save if figure has content
                filename = f"plot_{execution_id}_{len(outputs)}.png"
                saved_path = save_matplotlib_figure(fig, filename)
                if saved_path:
                    outputs.append(capture_output(saved_path, 'image', {
                        'width': fig.get_figwidth() * fig.dpi,
                        'height': fig.get_figheight() * fig.dpi,
                        'mimeType': 'image/png'
                    }))
            plt.close()  # Close the figure to free memory
        
        plt.show = custom_show
    
    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    
    try:
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            # Execute the user code in the persistent global namespace
            exec(code, _session_globals)
            
            # Auto-capture any remaining matplotlib figures
            if HAS_MATPLOTLIB and plt.get_fignums():
                for fig_num in plt.get_fignums():
                    fig = plt.figure(fig_num)
                    if fig.get_axes():
                        filename = f"plot_{execution_id}_{len(outputs)}.png"
                        saved_path = save_matplotlib_figure(fig, filename)
                        if saved_path:
                            outputs.append(capture_output(saved_path, 'image', {
                                'width': fig.get_figwidth() * fig.dpi,
                                'height': fig.get_figheight() * fig.dpi,
                                'mimeType': 'image/png'
                            }))
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

app.listen(PORT, () => {
  console.log(`Design Diary server running on port ${PORT}`);
  console.log(`Using Python executable: ${PYTHON_EXECUTABLE}`);
  console.log(`Output directory: ${outputDir}`);
});
