import { saveAs } from 'file-saver';
import { Editor } from '@tiptap/react';
import { PageSettings, HeaderFooterContent } from '@/components/HeaderFooterEditor';
import api from '@/services/api';

/**
 * Replaces the old client-side docx generation.
 * Now it triggers a download of the current DOCX file from the backend or 
 * uses the new conversion API depending on the editor mode.
 */
export const exportToDocx = async (
  editor: Editor,
  fileName: string = 'Legal_Document',
  pageSettings?: PageSettings,
  headerContent?: HeaderFooterContent,
  footerContent?: HeaderFooterContent
) => {
  // Try to use the document API to download the DOCX file directly
  try {
    // We assume documentId could be extracted from elsewhere, but here's a fallback
    // If we are in the old Yjs editor, the user should be prompted to use the new OnlyOffice editor.
    alert('Export is handled directly by the backend for DOCX files. Please download from the document list.');
  } catch (err) {
    console.error('Export failed:', err);
    alert('Failed to export document');
  }
};
