import { Dirent } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';

const INDEX_FILE_NAME = 'index.ts';
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git']);

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
    const entries = await this.readDirectory(directoryPath);
    return entries
      .filter((entry) => this.isTypeScriptFile(entry))
      .map((entry) => path.join(directoryPath, entry.name));
  }

  /**
   * Gets subdirectories in a directory, excluding ignored folders.
   * @param directoryPath The directory path to search
   * @returns Array of absolute subdirectory paths
   */
  async getSubdirectories(directoryPath: string): Promise<string[]> {
    const entries = await this.readDirectory(directoryPath);
    return entries
      .filter((entry) => this.isTraversableDirectory(entry))
      .map((entry) => path.join(directoryPath, entry.name));
  }

  /**
   * Checks if a directory entry is a TypeScript file (excluding index.ts).
   * @param entry The directory entry
   * @returns True if it's a TypeScript file
   */
  private isTypeScriptFile(entry: Dirent): boolean {
    if (!entry.isFile()) {
      return false;
    }

    const isIndexFile = entry.name === INDEX_FILE_NAME;
    const isDefinitionFile = entry.name.endsWith('.d.ts');
    const isTsFile = entry.name.endsWith('.ts') || entry.name.endsWith('.tsx');

    return isTsFile && !isIndexFile && !isDefinitionFile;
  }

  /**
   * Determines if the entry is a traversable directory.
   * @param entry The directory entry
   * @returns True if the directory should be traversed
   */
  private isTraversableDirectory(entry: Dirent): boolean {
    return (
      entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name) && !entry.name.startsWith('.')
    );
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

  /**
   * Creates a directory and all intermediate directories if needed.
   * @param directoryPath The directory to create
   */
  async ensureDirectory(directoryPath: string): Promise<void> {
    try {
      await fs.mkdir(directoryPath, { recursive: true });
    } catch (error) {
      throw new Error(
        `Failed to create directory ${directoryPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Removes a file or directory tree.
   * @param targetPath The path to remove
   */
  async removePath(targetPath: string): Promise<void> {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (error) {
      throw new Error(
        `Failed to remove path ${targetPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Creates a temporary directory using the provided prefix.
   * @param prefix The prefix for the temporary directory
   * @returns The created directory path
   */
  async createTempDirectory(prefix: string): Promise<string> {
    try {
      return await fs.mkdtemp(prefix);
    } catch (error) {
      throw new Error(
        `Failed to create temporary directory with prefix ${prefix}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Checks whether a file exists.
   * @param filePath The file path to check
   * @returns True if the file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reads the entries of a directory with error handling.
   * @param directoryPath The directory path
   * @returns Array of directory entries
   */
  private async readDirectory(directoryPath: string): Promise<Dirent[]> {
    try {
      return await fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      throw new Error(
        `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
