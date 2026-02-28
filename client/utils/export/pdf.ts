import jsPDF from 'jspdf';
import { Editor } from '@tiptap/react';

// Basic PDF export that extracts text. For rich formatting preservation,
// html2canvas or server-side rendering is usually required.
// This is a "quick text dump" version suitable for draft reviews.
export const exportToPdf = (editor: Editor, fileName: string = 'Legal_Document', isFinalized: boolean = false) => {
  const doc = new jsPDF();
  const text = editor.getText();

  const splitText = doc.splitTextToSize(text, 180);

  if (isFinalized) {
    doc.setTextColor(220, 220, 220);
    doc.setFontSize(80);
    doc.text('FINALIZED', 105, 150, { angle: 45, align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(16);
  doc.text(fileName.toUpperCase(), 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(splitText, 14, 30);

  doc.save(`${fileName}.pdf`);
};
