/*
 * Copyright 2025 Robert Lindley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { INDEX_FILENAME } from '../../types/index.js';
import { getErrorMessage } from '../../utils/index.js';

const IGNORED_DIRECTORIES = new Set(['node_modules', '.git']);

/**
 * Service responsible for file system operations.
 * Follows Single Responsibility Principle by handling only file I/O operations.
 */
export class FileSystemService {
  private readonly fs: typeof fs;

  /**
   * Creates a new FileSystemService instance.
   * @param fsModule The file system module to use (defaults to Node.js fs/promises).
   */
  constructor(fsModule: typeof fs = fs) {
    this.fs = fsModule;
  }
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
   * Checks if a directory entry is a TypeScript file (excluding index.ts, definition files, and test files).
   * @param entry The directory entry
   * @returns True if it's a TypeScript file; otherwise, false
   */
  private isTypeScriptFile(entry: Dirent): boolean {
    if (!entry.isFile()) return false;
    if (this.shouldExcludeFile(entry.name)) return false;
    return this.isTypeScriptExtension(entry.name);
  }

  /**
   * Checks if a file should be excluded from barrel exports.
   * @param filename The filename to check
   * @returns True if the file should be excluded; otherwise, false
   */
  private shouldExcludeFile(filename: string): boolean {
    return filename === INDEX_FILENAME || filename.endsWith('.d.ts') || this.isTestFile(filename);
  }

  /**
   * Checks if a filename has a TypeScript extension.
   * @param filename The filename to check
   * @returns True if it's a TypeScript file extension; otherwise, false
   */
  private isTypeScriptExtension(filename: string): boolean {
    return filename.endsWith('.ts') || filename.endsWith('.tsx');
  }

  /**
   * Checks if a filename represents a test file.
   * @param filename The filename to check
   * @returns True if it's a test file; otherwise, false
   */
  private isTestFile(filename: string): boolean {
    return (
      filename.endsWith('.spec.ts') ||
      filename.endsWith('.test.ts') ||
      filename.endsWith('.spec.tsx') ||
      filename.endsWith('.test.tsx')
    );
  }

  /**
   * Determines if the entry is a traversable directory.
   * @param entry The directory entry
   * @returns True if the directory should be traversed; otherwise, false
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
   * @throws Error if the read operation fails
   */
  async readFile(filePath: string): Promise<string> {
    try {
      return await this.fs.readFile(filePath, 'utf-8');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to read file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Writes content to a file.
   * @param filePath The file path to write to
   * @param content The content to write
   * @throws Error if the write operation fails
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await this.fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to write file ${filePath}: ${errorMessage}`);
    }
  }

  /**
   * Creates a directory and all intermediate directories if needed.
   * @param directoryPath The directory to create
   * @throws Error if the directory creation fails
   */
  async ensureDirectory(directoryPath: string): Promise<void> {
    try {
      await this.fs.mkdir(directoryPath, { recursive: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to create directory ${directoryPath}: ${errorMessage}`);
    }
  }

  /**
   * Removes a file or directory tree.
   * @param targetPath The path to remove
   * @throws Error if the removal fails
   */
  async removePath(targetPath: string): Promise<void> {
    try {
      await this.fs.rm(targetPath, { recursive: true, force: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to remove path ${targetPath}: ${errorMessage}`);
    }
  }

  /**
   * Creates a temporary directory using the provided prefix.
   * @param prefix The prefix for the temporary directory
   * @returns The created directory path
   * @throws Error if the directory creation fails
   */
  async createTempDirectory(prefix: string): Promise<string> {
    try {
      return await this.fs.mkdtemp(prefix);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(
        `Failed to create temporary directory with prefix ${prefix}: ${errorMessage}`,
      );
    }
  }

  /**
   * Checks if a file or directory exists.
   * @param filePath The path to check
   * @returns True if the path exists; otherwise, false
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a path is a directory.
   * @param filePath The path to check
   * @returns True if the path exists and is a directory; otherwise, false
   */
  async isDirectory(filePath: string): Promise<boolean> {
    try {
      const stat = await this.fs.stat(filePath);
      return stat.isDirectory();
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
      return await this.fs.readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      throw new Error(`Failed to read directory: ${errorMessage}`);
    }
  }
}
