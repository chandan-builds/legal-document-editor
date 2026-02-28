import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { Editor } from '@tiptap/react';

export const exportToDocx = async (editor: Editor, fileName: string = 'Legal_Document') => {
  const json = editor.getJSON();
  const children: any[] = [];

  // Simple traversal of TipTap JSON to Docx Nodes
  // This is a basic implementation. For production, cover all node types.
  
  if (json.content) {
    json.content.forEach((node) => {
      switch (node.type) {
        case 'heading':
          const headingText = (node.content?.[0] as any)?.text || '';
          children.push(
            new Paragraph({
              text: headingText,
              heading: node.attrs?.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
              spacing: { after: 200, before: 200 },
            })
          );
          break;
        case 'paragraph':
          const runs: TextRun[] = [];
          if (node.content) {
            node.content.forEach((textNode) => {
              const tNode = textNode as any;
              if (tNode.type === 'text') {
                runs.push(
                  new TextRun({
                    text: tNode.text || '',
                    bold: tNode.marks?.some((m: any) => m.type === 'bold'),
                    italics: tNode.marks?.some((m: any) => m.type === 'italic'),
                    strike: tNode.marks?.some((m: any) => m.type === 'strike'),
                  })
                );
              }
            });
          }
          children.push(
            new Paragraph({
              children: runs,
              spacing: { after: 120 },
            })
          );
          break;
        case 'clause':
           // Custom handling for clauses
           children.push(
             new Paragraph({
               text: `[CLAUSE: ${node.attrs?.status?.toUpperCase()}]`,
               heading: HeadingLevel.HEADING_3,
               spacing: { before: 240, after: 120 },
             })
           );
           if (node.content) {
             node.content.forEach((subNode: any) => {
                // Recursively handle clause content (simplified to just text for now)
                if (subNode.type === 'paragraph' && subNode.content) {
                    const subRuns = subNode.content.map((t: any) => new TextRun({ text: t.text }));
                    children.push(new Paragraph({ children: subRuns }));
                }
             });
           }
           break;
        case 'bulletList':
            if (node.content) {
                node.content.forEach((listItem: any) => {
                     if (listItem.content) {
                        listItem.content.forEach((p: any) => {
                             if (p.content) {
                                 const listRuns = p.content.map((t: any) => new TextRun({ text: t.text }));
                                 children.push(new Paragraph({ children: listRuns, bullet: { level: 0 } }));
                             }
                        });
                     }
                });
            }
            break;
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
            new Paragraph({
                text: "LEGAL DOCUMENT DRAFT",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 },
            }),
            ...children
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
