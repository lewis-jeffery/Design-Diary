export interface ExecutionResult {
  cellId: string;
  sessionId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  outputs?: Array<{
    type: string;
    data: string;
    metadata?: any;
  }>;
  success: boolean;
  timestamp: string;
}

export interface ExecutionError {
  error: string;
  cellId: string;
  sessionId?: string;
}

class PythonExecutionService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  async executeCode(code: string, cellId: string, documentId?: string): Promise<ExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, cellId, documentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to execute code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExecutionResult(sessionId: string): Promise<ExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/execution/${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get execution result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async checkHealth(): Promise<{ status: string; pythonExecutable: string; timestamp: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to check server health: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPythonInfo(): Promise<{ version: string; executable: string; success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/python-info`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get Python info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const pythonExecutionService = new PythonExecutionService();
