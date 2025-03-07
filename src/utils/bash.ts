import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Execute a shell command and return the output
 * @param command The shell command to execute
 * @param timeout Optional timeout in milliseconds
 * @returns The command output (stdout)
 */
export async function executeCommand(command: string, timeout?: number): Promise<string> {
  try {
    const options = timeout ? { timeout } : {};
    const { stdout, stderr } = await execPromise(command, options);
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
}
