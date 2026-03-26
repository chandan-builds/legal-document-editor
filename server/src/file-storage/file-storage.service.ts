import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly storagePath: string;

  constructor(private readonly config: ConfigService) {
    this.storagePath = path.resolve(
      config.get<string>('STORAGE_PATH', './storage/docs'),
    );
    // Ensure base storage dir exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Get the absolute directory path for a document.
   */
  getDocumentDir(docId: string): string {
    return path.join(this.storagePath, docId);
  }

  /**
   * Get the absolute path to the current (active) DOCX file.
   */
  getDocumentPath(docId: string): string {
    return path.join(this.getDocumentDir(docId), 'current.docx');
  }

  /**
   * Get the versions directory for a document.
   */
  getVersionsDir(docId: string): string {
    return path.join(this.getDocumentDir(docId), 'versions');
  }

  /**
   * Save an uploaded DOCX file as current.docx.
   * Creates the document directory if it doesn't exist.
   */
  async saveUpload(
    docId: string,
    buffer: Buffer,
    _fileName: string,
  ): Promise<string> {
    const docDir = this.getDocumentDir(docId);
    const versionsDir = this.getVersionsDir(docId);

    // Create directories
    fs.mkdirSync(docDir, { recursive: true });
    fs.mkdirSync(versionsDir, { recursive: true });

    const filePath = this.getDocumentPath(docId);
    fs.writeFileSync(filePath, buffer);

    this.logger.log(`Saved upload for doc ${docId}: ${filePath}`);
    return filePath;
  }

  /**
   * Create a version snapshot: copy current.docx → versions/v{N}_{timestamp}.docx.
   * Returns the relative path to the version file.
   */
  async createVersionSnapshot(
    docId: string,
    versionNumber: number,
  ): Promise<string> {
    const currentPath = this.getDocumentPath(docId);
    if (!fs.existsSync(currentPath)) {
      throw new Error(`No current.docx found for doc ${docId}`);
    }

    const versionsDir = this.getVersionsDir(docId);
    fs.mkdirSync(versionsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionFileName = `v${versionNumber}_${timestamp}.docx`;
    const versionPath = path.join(versionsDir, versionFileName);

    fs.copyFileSync(currentPath, versionPath);
    this.logger.log(
      `Created version snapshot v${versionNumber} for doc ${docId}`,
    );

    // Return path relative to storage root
    return path.join(docId, 'versions', versionFileName);
  }

  /**
   * Overwrite current.docx with new content (from OnlyOffice callback).
   */
  async overwriteCurrent(docId: string, buffer: Buffer): Promise<void> {
    const filePath = this.getDocumentPath(docId);
    fs.writeFileSync(filePath, buffer);
    this.logger.log(`Overwrote current.docx for doc ${docId}`);
  }

  /**
   * Restore a specific version: copy versions/v{N}.docx → current.docx.
   * @param versionRelativePath  Relative path stored in DB (e.g. "{docId}/versions/v2_2026...docx")
   */
  async restoreVersion(
    docId: string,
    versionRelativePath: string,
  ): Promise<void> {
    const absoluteVersionPath = path.join(
      this.storagePath,
      versionRelativePath,
    );
    if (!fs.existsSync(absoluteVersionPath)) {
      throw new Error(`Version file not found: ${absoluteVersionPath}`);
    }

    const currentPath = this.getDocumentPath(docId);
    fs.copyFileSync(absoluteVersionPath, currentPath);
    this.logger.log(
      `Restored version from ${versionRelativePath} for doc ${docId}`,
    );
  }

  /**
   * Delete an entire document directory and all version files.
   */
  async deleteDocumentFiles(docId: string): Promise<void> {
    const docDir = this.getDocumentDir(docId);
    if (fs.existsSync(docDir)) {
      fs.rmSync(docDir, { recursive: true, force: true });
      this.logger.log(`Deleted all files for doc ${docId}`);
    }
  }

  /**
   * Delete a single version file.
   */
  async deleteVersionFile(versionRelativePath: string): Promise<void> {
    const absolutePath = path.join(this.storagePath, versionRelativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      this.logger.log(`Deleted version file: ${absolutePath}`);
    }
  }

  /**
   * Calculate SHA-256 hash of a file.
   */
  getFileHash(filePath: string): string {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.join(this.storagePath, filePath);
    const buffer = fs.readFileSync(absolutePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Read the current.docx as a Buffer.
   */
  readCurrentFile(docId: string): Buffer {
    const filePath = this.getDocumentPath(docId);
    return fs.readFileSync(filePath);
  }

  /**
   * Check if a document's current file exists.
   */
  fileExists(docId: string): boolean {
    return fs.existsSync(this.getDocumentPath(docId));
  }
}
