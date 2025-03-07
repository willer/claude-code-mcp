import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandExecutionError } from './bash.js';

const execPromise = promisify(exec);

/**
 * Custom error class for file system operations
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly path: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * Read a file from the filesystem
 * @param filePath The path to the file to read
 * @param offset Optional line number to start reading from
 * @param limit Optional number of lines to read
 * @returns The file contents
 * @throws {FileSystemError} If the file cannot be read
 */
export async function readFile(
  filePath: string,
  offset?: number,
  limit?: number
): Promise<string> {
  try {
    // Validate file path
    if (!filePath) {
      throw new FileSystemError(
        'File path is required',
        'read',
        filePath
      );
    }

    // Check if file exists before trying to read it
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error) {
      throw new FileSystemError(
        `File does not exist or is not readable: ${filePath}`,
        'read',
        filePath,
        error instanceof Error ? error : undefined
      );
    }
    
    let content = await fs.readFile(filePath, 'utf-8');
    
    if (offset || limit) {
      const lines = content.split('\n');
      
      // Validate offset
      const startLine = offset ? Math.max(0, offset - 1) : 0;
      if (startLine >= lines.length) {
        throw new FileSystemError(
          `Offset ${offset} is out of range for file with ${lines.length} lines`,
          'read',
          filePath
        );
      }
      
      // Validate limit
      const endLine = limit ? Math.min(lines.length, startLine + limit) : lines.length;
      
      content = lines.slice(startLine, endLine).join('\n');
    }
    
    return content;
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    
    throw new FileSystemError(
      `Failed to read file: ${filePath}`,
      'read',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * List files in a directory
 * @param dirPath The path to the directory to list
 * @returns Array of file information objects
 * @throws {FileSystemError} If the directory cannot be read
 */
export async function listFiles(dirPath: string): Promise<any[]> {
  try {
    // Validate directory path
    if (!dirPath) {
      throw new FileSystemError(
        'Directory path is required',
        'list',
        dirPath
      );
    }

    // Check if directory exists and is readable
    try {
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        throw new FileSystemError(
          `Path is not a directory: ${dirPath}`,
          'list',
          dirPath
        );
      }
    } catch (error) {
      throw new FileSystemError(
        `Directory does not exist or is not accessible: ${dirPath}`,
        'list',
        dirPath,
        error instanceof Error ? error : undefined
      );
    }
    
    const files = await fs.readdir(dirPath);
    const fileDetails = await Promise.all(
      files.map(async (file) => {
        try {
          const filePath = path.join(dirPath, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        } catch (error) {
          console.warn(`Error getting stats for ${file}: ${error}`);
          return {
            name: file,
            path: path.join(dirPath, file),
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
    
    return fileDetails;
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    
    throw new FileSystemError(
      `Failed to list directory: ${dirPath}`,
      'list',
      dirPath,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Search for files matching a glob pattern
 * @param pattern The glob pattern to match
 * @param searchPath The directory to search in
 * @returns Array of matching file paths
 * @throws {CommandExecutionError} If the search command fails
 */
export async function searchGlob(
  pattern: string,
  searchPath: string = process.cwd()
): Promise<string[]> {
  try {
    // Validate pattern and search path
    if (!pattern) {
      throw new Error('Search pattern is required');
    }
    
    // Escape special characters in the pattern to prevent command injection
    const escapedPattern = pattern.replace(/(["\s'$`\\])/g, '\\$1');
    
    const { stdout } = await execPromise(`find ${searchPath} -type f -name "${escapedPattern}" | sort`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      throw error;
    }
    
    throw new CommandExecutionError(
      `Failed to search for files matching pattern: ${pattern}`,
      `find ${searchPath} -type f -name "${pattern}" | sort`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Search for text in files
 * @param pattern The pattern to search for
 * @param searchPath The path to search in
 * @param include Optional file pattern to include
 * @returns Search results
 * @throws {CommandExecutionError} If the search command fails
 */
export async function grepSearch(
  pattern: string,
  searchPath: string = process.cwd(),
  include?: string
): Promise<string> {
  try {
    // Validate pattern and search path
    if (!pattern) {
      throw new Error('Search pattern is required');
    }
    
    // Escape special characters in the pattern to prevent command injection
    const escapedPattern = pattern.replace(/(["\s'$`\\])/g, '\\$1');
    
    // Escape include pattern if provided
    const escapedInclude = include ? include.replace(/(["\s'$`\\])/g, '\\$1') : '';
    const includeFlag = escapedInclude ? `--include="${escapedInclude}"` : '';
    
    const { stdout } = await execPromise(`grep -r ${includeFlag} "${escapedPattern}" ${searchPath}`);
    return stdout;
  } catch (error: any) {
    if (error.code === 1 && error.stdout === '') {
      // grep returns exit code 1 when no matches are found
      return 'No matches found';
    }
    
    if (error instanceof CommandExecutionError) {
      throw error;
    }
    
    throw new CommandExecutionError(
      `Failed to search for text matching pattern: ${pattern}`,
      `grep -r ${include ? `--include="${include}"` : ''} "${pattern}" ${searchPath}`,
      error.stderr,
      error.code,
      error.signal
    );
  }
}

/**
 * Write content to a file
 * @param filePath The path to the file to write
 * @param content The content to write to the file
 * @throws {FileSystemError} If the file cannot be written
 */
export async function writeFile(
  filePath: string,
  content: string
): Promise<void> {
  try {
    // Validate file path
    if (!filePath) {
      throw new FileSystemError(
        'File path is required',
        'write',
        filePath
      );
    }
    
    // Create directory if it doesn't exist
    const directory = path.dirname(filePath);
    try {
      await fs.mkdir(directory, { recursive: true });
    } catch (error) {
      throw new FileSystemError(
        `Failed to create directory: ${directory}`,
        'write',
        filePath,
        error instanceof Error ? error : undefined
      );
    }
    
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    
    throw new FileSystemError(
      `Failed to write file: ${filePath}`,
      'write',
      filePath,
      error instanceof Error ? error : undefined
    );
  }
}
