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

  /**
   * Create a minimal valid blank DOCX for documents created without an upload.
   * A DOCX is a ZIP archive containing XML. We use the 'archiver' package.
   */
  async createBlankDocument(docId: string): Promise<string> {
    const docDir = this.getDocumentDir(docId);
    const versionsDir = this.getVersionsDir(docId);

    fs.mkdirSync(docDir, { recursive: true });
    fs.mkdirSync(versionsDir, { recursive: true });

    const filePath = this.getDocumentPath(docId);

    // Build a minimal valid DOCX using JSZip-style manual approach
    // DOCX = ZIP with: [Content_Types].xml, _rels/.rels, word/document.xml, word/_rels/document.xml.rels
    const archiver = require('archiver');
    const output = fs.createWriteStream(filePath);

    return new Promise<string>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.log(
          `Created blank DOCX for doc ${docId}: ${filePath} (${archive.pointer()} bytes)`,
        );
        resolve(filePath);
      });

      archive.on('error', (err: Error) => {
        this.logger.error(`Failed to create blank DOCX: ${err.message}`);
        reject(err);
      });

      archive.pipe(output);

      // [Content_Types].xml
      archive.append(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        { name: '[Content_Types].xml' },
      );

      // _rels/.rels
      archive.append(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        { name: '_rels/.rels' },
      );

      // word/document.xml (empty body)
      archive.append(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mo="http://schemas.microsoft.com/office/mac/office/2008/main"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:mv="urn:schemas-microsoft-com:mac:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">
  <w:body>
    <w:p><w:r><w:t></w:t></w:r></w:p>
  </w:body>
</w:document>`,
        { name: 'word/document.xml' },
      );

      // word/_rels/document.xml.rels
      archive.append(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`,
        { name: 'word/_rels/document.xml.rels' },
      );

      archive.finalize();
    });
  }
}
