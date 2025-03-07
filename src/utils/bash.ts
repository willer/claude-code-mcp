import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Custom error class for command execution errors
 */
export class CommandExecutionError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly stderr?: string,
    public readonly code?: number,
    public readonly signal?: string
  ) {
    super(message);
    this.name = 'CommandExecutionError';
  }
}

/**
 * Execute a shell command and return the output
 * @param command The shell command to execute
 * @param timeout Optional timeout in milliseconds (defaults to 60000ms, max 600000ms)
 * @returns The command output (stdout)
 * @throws {CommandExecutionError} If the command fails to execute
 */
export async function executeCommand(command: string, timeout?: number): Promise<string> {
  // Validate and limit timeout
  const maxTimeout = 600000; // 10 minutes
  const defaultTimeout = 60000; // 1 minute
  const validatedTimeout = timeout ? Math.min(timeout, maxTimeout) : defaultTimeout;
  
  try {
    const options = { timeout: validatedTimeout };
    const { stdout, stderr } = await execPromise(command, options);
    
    // Log stderr but don't fail if it's present (many commands output to stderr even on success)
    if (stderr) {
      console.warn(`Command stderr: ${stderr}`);
    }
    
    return stdout;
  } catch (error: any) {
    // Create a more detailed error message
    const errorMessage = `Failed to execute command: ${command}`;
    const details = [];
    
    if (error.stderr) details.push(`stderr: ${error.stderr}`);
    if (error.code) details.push(`exit code: ${error.code}`);
    if (error.signal) details.push(`signal: ${error.signal}`);
    if (error.message) details.push(`error: ${error.message}`);
    
    const detailedMessage = details.length > 0 
      ? `${errorMessage} (${details.join(', ')})` 
      : errorMessage;
    
    console.error(detailedMessage);
    
    throw new CommandExecutionError(
      detailedMessage,
      command,
      error.stderr,
      error.code,
      error.signal
    );
  }
}
