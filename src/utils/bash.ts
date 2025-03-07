import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Execute a shell command and return the output
 * @param command The shell command to execute
 * @returns The command output (stdout)
 */
export async function executeCommand(command: string): Promise<string> {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.error(`Command stderr: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Error executing command: ${command}`, error);
    throw error;
  }
}
