import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Read a file from the filesystem
 * @param filePath The path to the file to read
 * @param offset Optional line number to start reading from
 * @param limit Optional number of lines to read
 * @returns The file contents
 */
export async function readFile(
  filePath: string,
  offset?: number,
  limit?: number
): Promise<string> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    
    if (offset || limit) {
      const lines = content.split('\n');
      const startLine = offset ? offset - 1 : 0;
      const endLine = limit ? startLine + limit : lines.length;
      content = lines.slice(startLine, endLine).join('\n');
    }
    
    return content;
  } catch (error) {
    throw error;
  }
}

/**
 * List files in a directory
 * @param dirPath The path to the directory to list
 * @returns Array of file information objects
 */
export async function listFiles(dirPath: string): Promise<any[]> {
  try {
    const files = await fs.readdir(dirPath);
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          path: filePath,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      })
    );
    
    return fileDetails;
  } catch (error) {
    throw error;
  }
}

/**
 * Search for files matching a glob pattern
 * @param pattern The glob pattern to match
 * @param searchPath The directory to search in
 * @returns Array of matching file paths
 */
export async function searchGlob(
  pattern: string,
  searchPath: string = process.cwd()
): Promise<string[]> {
  try {
    const { stdout } = await execPromise(`find ${searchPath} -type f -name "${pattern}" | sort`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    throw error;
  }
}

/**
 * Search for text in files
 * @param pattern The pattern to search for
 * @param searchPath The path to search in
 * @param include Optional file pattern to include
 * @returns Search results
 */
export async function grepSearch(
  pattern: string,
  searchPath: string = process.cwd(),
  include?: string
): Promise<string> {
  try {
    const includeFlag = include ? `--include="${include}"` : '';
    const { stdout } = await execPromise(`grep -r ${includeFlag} "${pattern}" ${searchPath}`);
    return stdout;
  } catch (error: any) {
    if (error.code === 1 && error.stdout === '') {
      // grep returns exit code 1 when no matches are found
      return 'No matches found';
    }
    throw error;
  }
}

/**
 * Write content to a file
 * @param filePath The path to the file to write
 * @param content The content to write to the file
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw error;
  }
}
