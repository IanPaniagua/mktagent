import { ParsedDocument } from './types';

export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ParsedDocument> {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  try {
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfMod = await import('pdf-parse') as any;
      const pdfParse = pdfMod.default || pdfMod;
      const data = await pdfParse(buffer);
      return {
        filename,
        content: data.text.slice(0, 15000),
        type: 'pdf',
      };
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === 'docx'
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return {
        filename,
        content: result.value.slice(0, 15000),
        type: 'docx',
      };
    }

    if (mimeType === 'text/plain' || ext === 'txt' || ext === 'md') {
      return {
        filename,
        content: buffer.toString('utf-8').slice(0, 15000),
        type: 'text',
      };
    }

    return {
      filename,
      content: '',
      type: ext,
    };
  } catch (error) {
    console.warn(`Failed to parse ${filename}:`, error);
    return {
      filename,
      content: '',
      type: ext,
    };
  }
}

export function base64ToBuffer(base64: string): Buffer {
  // Handle data URLs
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  return Buffer.from(base64Data, 'base64');
}
