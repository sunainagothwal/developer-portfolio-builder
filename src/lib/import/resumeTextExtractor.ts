import { File } from 'expo-file-system';
import { extractPdfText, extractDocxText } from '@utils/documentText';

export type ResumeFileKind = 'txt' | 'pdf' | 'docx' | 'unsupported';

export interface ExtractionResult {
  text: string;
  kind: ResumeFileKind;
  /** Set when we could read the file but got little or nothing useful out. */
  warning?: string;
}

export function detectKind(nameOrUri: string): ResumeFileKind {
  const lower = nameOrUri.toLowerCase();
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'txt';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  return 'unsupported';
}

export async function extractResumeText(uri: string, fileName: string): Promise<ExtractionResult> {
  const kind = detectKind(fileName || uri);

  if (kind === 'unsupported') {
    return {
      text: '',
      kind,
      warning: 'Unsupported file type. Please upload a PDF, DOCX or TXT file. (Legacy .doc is not supported.)',
    };
  }

  const file = new File(uri);

  if (kind === 'txt') {
    return { text: await file.text(), kind };
  }

  const bytes = await file.bytes();
  const text = kind === 'pdf' ? extractPdfText(bytes) : extractDocxText(bytes);

  if (text.trim().length < 40) {
    return {
      text,
      kind,
      warning:
        kind === 'pdf'
          ? 'Very little text could be read from this PDF. If it is a scanned image, the text has to be recognised (OCR) which this app cannot do — try a text-based PDF or a TXT file.'
          : 'Very little text could be read from this DOCX. Try re-saving it, or upload a PDF or TXT instead.',
    };
  }

  return { text, kind };
}
