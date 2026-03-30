import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma';
import { FileStorageService } from '../file-storage/file-storage.service';
import * as fs from 'fs';

/**
 * Generates OnlyOffice editor configuration and handles document key management.
 */
@Injectable()
export class OnlyOfficeService {
  private readonly logger = new Logger(OnlyOfficeService.name);
  private readonly onlyofficeUrl: string;
  private readonly callbackUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly fileStorageService: FileStorageService,
  ) {
    this.onlyofficeUrl = config.get<string>(
      'ONLYOFFICE_URL',
      'https://legal-office.azinotech.com',
    );
    this.callbackUrl = config.get<string>(
      'ONLYOFFICE_CALLBACK_URL',
      'http://host.docker.internal:3001/onlyoffice/callback',
    );
  }

  /**
   * Get the public URL where the OnlyOffice JS API script can be loaded.
   */
  getApiScriptUrl(): string {
    return `${this.onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
  }

  /**
   * Generate a unique document key for OnlyOffice.
   * OnlyOffice uses this to cache documents — changing the key forces a re-download.
   * Format: doc_{docId}_v{version}_{timestamp}
   */
  generateDocumentKey(docId: string, version: number): string {
    const timestamp = Date.now();
    return `doc_${docId.replace(/-/g, '')}_v${version}_${timestamp}`;
  }

  /**
   * Build the full OnlyOffice editor config JSON.
   *
   * @see https://api.onlyoffice.com/editors/config/
   */
  async buildEditorConfig(
    docId: string,
    userId: string,
    userName: string,
    userRole: string,
    serverUrl?: string,
  ): Promise<any> {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        title: true,
        fileName: true,
        currentVersion: true,
      },
    });

    if (!doc) {
      throw new Error(`Document ${docId} not found`);
    }

    const documentKey = this.generateDocumentKey(docId, doc.currentVersion);
    const displayTitle = doc.fileName || `${doc.title}.docx`;

    // Try to determine the callback dynamically from the incoming request's host
    const activeCallbackUrl = serverUrl ? `${serverUrl}/onlyoffice/callback` : this.callbackUrl;
    
    // URL that OnlyOffice will call to download the document
    const callbackOrigin = new URL(activeCallbackUrl).origin;
    const fileDownloadUrl = `${callbackOrigin}/onlyoffice/files/${docId}`;

    // If the file doesn't exist yet (e.g., brand new blank document),
    // we omit the URL so OnlyOffice initializes an empty editor instead of crashing with a 404.
    const fileExists = fs.existsSync(
      this.fileStorageService.getDocumentPath(docId),
    );

    const isVendor = userRole === 'VENDOR';

    const documentConfig: any = {
      fileType: 'docx',
      key: documentKey,
      title: displayTitle,
      permissions: {
        edit: true, // MUST be true for everyone; otherwise Accept/Reject buttons break
        download: true,
        print: true,
        review: true,
        comment: true,
        protect: false,
      },
    };

    if (fileExists) {
      documentConfig.url = fileDownloadUrl;
    }

    return {
      document: documentConfig,
      editorConfig: {
        callbackUrl: activeCallbackUrl,
        mode: 'edit',
        lang: 'en',
        user: {
          id: userId,
          name: userName,
        },
        customization: {
          uiTheme: 'theme-light',
          autosave: true,
          forcesave: true,
          chat: false,
          compactHeader: true,
          feedback: false,
          help: false,
          hideRightMenu: false,
          toolbarNoTabs: true,
          trackChanges: true,
          plugins: false,
          loaderLogo: '',
          loaderName: '',
          logo: {
            image: '',
            imageDark: '',
            url: ''
          },
          customer: {
            name: 'Legal Editor',
            address: '',
            mail: '',
            www: '',
            info: '',
            logo: ''
          },
          layout: {
            toolbar: {
              references: false,
              protection: false,
              plugins: false,
            },
          },
        },
      },
      documentType: 'word',
    };
  }

  /**
   * Parse the document ID from a OnlyOffice document key.
   * Key format: doc_{docIdWithoutDashes}_v{version}_{timestamp}
   */
  parseDocIdFromKey(key: string): string | null {
    // Extract the UUID portion (without dashes) between "doc_" and "_v"
    const match = key.match(/^doc_([a-f0-9]+)_v\d+_\d+$/);
    if (!match) {
      this.logger.warn(`Could not parse docId from key: ${key}`);
      return null;
    }

    const hex = match[1];
    // Re-insert UUID dashes: 8-4-4-4-12
    if (hex.length === 32) {
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    return null;
  }
}
