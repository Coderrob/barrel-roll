import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Service responsible for file system operations.
 * Follows Single Responsibility Principle by handling only file I/O operations.
 */
export class FileSystemService {
  /**
   * Gets all TypeScript files in a directory (excluding index.ts).
   * @param directoryPath The directory path to search
   * @returns Array of file paths
   */
  async getTypeScriptFiles(directoryPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      const tsFiles: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'index.ts') {
          tsFiles.push(path.join(directoryPath, entry.name));
        }
      }

      return tsFiles;
    } catch (error) {
      throw new Error(
        `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Reads the content of a file.
   * @param filePath The file path to read
   * @returns The file content as a string
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Writes content to a file.
   * @param filePath The file path to write to
   * @param content The content to write
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
