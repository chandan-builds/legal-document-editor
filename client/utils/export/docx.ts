import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, ExternalHyperlink, ImageRun, Header, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import { Editor } from '@tiptap/react';
import { PageSettings, HeaderFooterContent, resolveTokens } from '@/components/HeaderFooterEditor';

// ── Map TipTap text alignment to DOCX alignment ────────────────────
function mapAlignment(textAlign?: string) {
  switch (textAlign) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    case 'left': return AlignmentType.LEFT;
    default: return undefined;
  }
}

// ── Convert a TipTap text node marks to TextRun options ────────────
function marksToTextRunOptions(marks?: any[]): Record<string, any> {
  if (!marks || marks.length === 0) return {};
  const opts: Record<string, any> = {};

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold': opts.bold = true; break;
      case 'italic': opts.italics = true; break;
      case 'strike': opts.strike = true; break;
      case 'underline': opts.underline = {}; break;
      case 'superscript': opts.superScript = true; break;
      case 'subscript': opts.subScript = true; break;
      case 'textStyle':
        if (mark.attrs?.color) opts.color = mark.attrs.color.replace('#', '');
        if (mark.attrs?.fontFamily) opts.font = mark.attrs.fontFamily;
        if (mark.attrs?.fontSize) opts.size = parseInt(mark.attrs.fontSize) * 2; // half-points
        break;
      case 'highlight':
        if (mark.attrs?.color) {
          opts.highlight = 'yellow'; // DOCX supports limited highlight colors
        }
        break;
      // Insertion/deletion marks: skip in export (tracked changes are preview only)
      case 'insertion':
      case 'deletion':
        break;
    }
  }
  return opts;
}

// ── Recursively extract text runs from content array ───────────────
function extractTextRuns(content?: any[]): (TextRun | ExternalHyperlink)[] {
  if (!content) return [new TextRun({ text: '' })];
  const runs: (TextRun | ExternalHyperlink)[] = [];

  for (const node of content) {
    if (node.type === 'text') {
      const linkMark = node.marks?.find((m: any) => m.type === 'link');
      if (linkMark?.attrs?.href) {
        runs.push(new ExternalHyperlink({
          children: [new TextRun({
            text: node.text || '',
            style: 'Hyperlink',
            ...marksToTextRunOptions(node.marks?.filter((m: any) => m.type !== 'link')),
          })],
          link: linkMark.attrs.href,
        }));
      } else {
        runs.push(new TextRun({
          text: node.text || '',
          ...marksToTextRunOptions(node.marks),
        }));
      }
    } else if (node.type === 'hardBreak') {
      runs.push(new TextRun({ break: 1 }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text: '' })];
}

// ── Map heading level ──────────────────────────────────────────────
function mapHeadingLevel(level?: number) {
  switch (level) {
    case 1: return HeadingLevel.HEADING_1;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    case 5: return HeadingLevel.HEADING_5;
    case 6: return HeadingLevel.HEADING_6;
    default: return undefined;
  }
}

// ── Process TipTap JSON nodes recursively ──────────────────────────
function processNode(node: any, listLevel: number = 0): (Paragraph | DocxTable)[] {
  const results: (Paragraph | DocxTable)[] = [];

  switch (node.type) {
    case 'heading': {
      const alignment = mapAlignment(node.attrs?.textAlign);
      results.push(new Paragraph({
        children: extractTextRuns(node.content),
        heading: mapHeadingLevel(node.attrs?.level),
        alignment,
        spacing: { after: 200, before: 200 },
      }));
      break;
    }

    case 'paragraph': {
      const alignment = mapAlignment(node.attrs?.textAlign);
      results.push(new Paragraph({
        children: extractTextRuns(node.content),
        alignment,
        spacing: { after: 120 },
      }));
      break;
    }

    case 'clause': {
      results.push(new Paragraph({
        text: `[CLAUSE: ${(node.attrs?.status || 'DRAFT').toUpperCase()}]`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      }));
      if (node.content) {
        for (const child of node.content) {
          results.push(...processNode(child, listLevel));
        }
      }
      break;
    }

    case 'table': {
      if (node.content) {
        const rows = node.content.map((rowNode: any) => {
          const cells = (rowNode.content || []).map((cellNode: any) => {
            const cellContent = (cellNode.content || []).flatMap((cn: any) => {
              if (cn.type === 'paragraph') {
                return [new Paragraph({ children: extractTextRuns(cn.content) })];
              }
              return [new Paragraph({ text: '' })];
            });
            return new DocxTableCell({
              children: cellContent.length > 0 ? cellContent : [new Paragraph({ text: '' })],
              width: { size: 100 / (rowNode.content?.length || 1), type: WidthType.PERCENTAGE },
            });
          });
          return new DocxTableRow({ children: cells });
        });
        results.push(new DocxTable({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
      }
      break;
    }

    case 'image': {
      const alt = node.attrs?.alt || 'Image';
      const src = node.attrs?.src || '';
      if (src.startsWith('data:')) {
        try {
          const base64Data = src.split(',')[1];
          const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          results.push(new Paragraph({
            children: [new ImageRun({
              data: buffer,
              transformation: { width: node.attrs?.width || 400, height: node.attrs?.height || 300 },
              type: 'png',
            })],
            spacing: { before: 100, after: 100 },
          }));
        } catch {
          results.push(new Paragraph({
            children: [new TextRun({ text: `[Image: ${alt}]`, italics: true, color: '666666' })],
          }));
        }
      } else {
        results.push(new Paragraph({
          children: [new TextRun({ text: `[Image: ${alt} — ${src}]`, italics: true, color: '666666' })],
          spacing: { before: 100, after: 100 },
        }));
      }
      break;
    }

    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      if (node.content) {
        for (const listItem of node.content) {
          if (listItem.content) {
            for (const p of listItem.content) {
              if (p.type === 'paragraph') {
                const isTask = node.type === 'taskList';
                const checked = listItem.attrs?.checked;
                const prefix = isTask ? (checked ? '☑ ' : '☐ ') : '';

                const textRuns = extractTextRuns(p.content);
                if (prefix) {
                  textRuns.unshift(new TextRun({ text: prefix }));
                }

                results.push(new Paragraph({
                  children: textRuns,
                  bullet: node.type === 'bulletList' || node.type === 'taskList'
                    ? { level: listLevel }
                    : undefined,
                  numbering: node.type === 'orderedList'
                    ? { reference: 'default-numbering', level: listLevel }
                    : undefined,
                }));
              } else {
                // Nested list
                results.push(...processNode(p, listLevel + 1));
              }
            }
          }
        }
      }
      break;
    }

    case 'blockquote': {
      if (node.content) {
        for (const child of node.content) {
          const childItems = processNode(child, listLevel);
          for (const cp of childItems) {
            if (cp instanceof Paragraph) {
              results.push(new Paragraph({
                ...cp,
                indent: { left: 720 },
                border: {
                  left: { color: '999999', size: 3, space: 1, style: 'single' as any },
                },
              }));
            } else {
              results.push(cp);
            }
          }
        }
      }
      break;
    }

    case 'horizontalRule': {
      results.push(new Paragraph({
        text: '─'.repeat(80),
        spacing: { before: 200, after: 200 },
      }));
      break;
    }

    default: {
      // For any unknown node type with content, process children
      if (node.content) {
        for (const child of node.content) {
          results.push(...processNode(child, listLevel));
        }
      }
      break;
    }
  }

  return results;
}

function createHeaderFooterElement(content: HeaderFooterContent | undefined, title: string) {
  if (!content) return undefined;

  const left = resolveTokens(content.left, { title });
  const center = resolveTokens(content.center, { title });
  const right = resolveTokens(content.right, { title });

  const textRuns: any[] = [];

  if (left) textRuns.push(new TextRun({ text: left + '   ' }));
  if (center) textRuns.push(new TextRun({ text: center + '   ' }));
  if (right) textRuns.push(new TextRun({ text: right }));

  if (content.showPageNumber) {
    if (textRuns.length > 0) textRuns.push(new TextRun({ text: ' | Page ' }));
    else textRuns.push(new TextRun({ text: 'Page ' }));
    textRuns.push(PageNumber.CURRENT);
  }

  if (textRuns.length === 0) return undefined;
  return new Paragraph({ children: textRuns, alignment: AlignmentType.CENTER });
}

export const exportToDocx = async (editor: Editor, fileName: string = 'Legal_Document', pageSettings?: PageSettings, headerContent?: HeaderFooterContent, footerContent?: HeaderFooterContent) => {
  const json = editor.getJSON();
  const children: (Paragraph | DocxTable)[] = [];

  // Title
  children.push(new Paragraph({
    text: 'LEGAL DOCUMENT DRAFT',
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // Process all content nodes
  if (json.content) {
    for (const node of json.content) {
      children.push(...processNode(node));
    }
  }

  const headerPara = createHeaderFooterElement(headerContent, fileName);
  const footerPara = createHeaderFooterElement(footerContent, fileName);

  const doc = new Document({
    sections: [{
      properties: {
        page: pageSettings ? {
          margin: {
            top: pageSettings.margins.top * 1440,
            bottom: pageSettings.margins.bottom * 1440,
            left: pageSettings.margins.left * 1440,
            right: pageSettings.margins.right * 1440,
          },
          size: {
            width: pageSettings.orientation === 'landscape' ? 15840 : 12240, // 11in x 8.5in
            height: pageSettings.orientation === 'landscape' ? 12240 : 15840,
          }
        } : undefined,
      },
      headers: headerPara ? {
        default: new Header({
          children: [headerPara],
        }),
      } : undefined,
      footers: footerPara ? {
        default: new Footer({
          children: [footerPara],
        }),
      } : undefined,
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
