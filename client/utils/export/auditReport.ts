import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuditLogEntry } from '@/types/audit';

export const generateAuditReport = (logs: AuditLogEntry[], version: number) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('AUDIT TRAIL REPORT', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Document Version: ${version}`, 14, 36);

  // Table Data Preparation
  const tableData = logs.map(log => [
    new Date(log.timestamp).toLocaleString(),
    log.userName,
    log.action.replace(/_/g, ' '),
    log.content ? log.content.substring(0, 50) + (log.content.length > 50 ? '...' : '') : '-',
    `v${log.documentVersion}`
  ]);

  // Generate Table
  autoTable(doc, {
    head: [['Timestamp', 'User', 'Action', 'Details', 'Ver']],
    body: tableData,
    startY: 44,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [66, 66, 66] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Save the PDF
  doc.save(`Audit_Report_v${version}.pdf`);
};
