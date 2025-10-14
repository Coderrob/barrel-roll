import * as vscode from 'vscode';
import * as path from 'path';
import { FileSystemService } from './services/fileSystemService';
import { ExportParser } from './services/exportParser';
import { BarrelContentBuilder } from './services/barrelContentBuilder';

/**
 * Main class responsible for orchestrating barrel file generation.
 * Follows Single Responsibility Principle by delegating specific tasks to service classes.
 */
export class BarrelFileGenerator {
  private fileSystemService: FileSystemService;
  private exportParser: ExportParser;
  private barrelContentBuilder: BarrelContentBuilder;

  constructor(
    fileSystemService?: FileSystemService,
    exportParser?: ExportParser,
    barrelContentBuilder?: BarrelContentBuilder,
  ) {
    this.fileSystemService = fileSystemService || new FileSystemService();
    this.exportParser = exportParser || new ExportParser();
    this.barrelContentBuilder = barrelContentBuilder || new BarrelContentBuilder();
  }

  /**
   * Generates or updates an index.ts barrel file in the specified directory.
   * @param directoryUri The URI of the directory where the barrel file should be created/updated
   */
  async generateBarrelFile(directoryUri: vscode.Uri): Promise<void> {
    const directoryPath = directoryUri.fsPath;
    const barrelFilePath = path.join(directoryPath, 'index.ts');

    // Get all TypeScript files in the directory (excluding index.ts itself)
    const tsFiles = await this.fileSystemService.getTypeScriptFiles(directoryPath);

    if (tsFiles.length === 0) {
      throw new Error('No TypeScript files found in the selected directory');
    }

    // Parse exports from each file
    const exportsByFile = new Map<string, string[]>();
    for (const filePath of tsFiles) {
      const content = await this.fileSystemService.readFile(filePath);
      const exports = this.exportParser.extractExports(content);
      if (exports.length > 0) {
        const relativePath = path.relative(directoryPath, filePath);
        exportsByFile.set(relativePath, exports);
      }
    }

    // Build barrel file content
    const barrelContent = this.barrelContentBuilder.buildContent(exportsByFile, directoryPath);

    // Write the barrel file
    await this.fileSystemService.writeFile(barrelFilePath, barrelContent);
  }
}
