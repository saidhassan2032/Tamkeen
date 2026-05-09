import type { Attachment } from '@/types';
import { MAX_ATTACHMENT_SIZE } from '@/types';

const IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const TEXT_MIME = ['text/plain', 'text/csv', 'application/json', 'text/markdown'];
const TEXT_EXTENSIONS = ['.txt', '.csv', '.json', '.md'];
const EXCEL_EXTENSIONS = ['.xlsx', '.xls', '.xlsm'];

export const ACCEPT_ATTRIBUTE = [
  ...IMAGE_MIME,
  ...TEXT_MIME,
  ...EXCEL_EXTENSIONS,
  ...TEXT_EXTENSIONS,
].join(',');

export class AttachmentError extends Error {}

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i).toLowerCase();
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsText(file);
  });
}

function bufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

export async function readFileAsAttachment(file: File): Promise<Attachment> {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new AttachmentError(`الملف "${file.name}" كبير جداً (الحد ${Math.round(MAX_ATTACHMENT_SIZE / 1024 / 1024)}MB)`);
  }

  const ext = getExt(file.name);
  const mime = file.type;

  // Image
  if (mime && IMAGE_MIME.includes(mime)) {
    const buf = await readAsArrayBuffer(file);
    const data = bufferToBase64(buf);
    return {
      name: file.name,
      type: 'image',
      mediaType: mime === 'image/jpg' ? 'image/jpeg' : mime,
      size: file.size,
      data,
    };
  }

  // Excel — parse client-side via SheetJS
  if (EXCEL_EXTENSIONS.includes(ext)) {
    const buf = await readAsArrayBuffer(file);
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buf, { type: 'array' });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      parts.push(`### ورقة: ${sheetName}\n${csv}`);
    }
    return {
      name: file.name,
      type: 'text',
      mediaType: 'text/csv',
      size: file.size,
      data: parts.join('\n\n'),
    };
  }

  // Text-like
  if ((mime && TEXT_MIME.includes(mime)) || TEXT_EXTENSIONS.includes(ext)) {
    const text = await readAsText(file);
    return {
      name: file.name,
      type: 'text',
      mediaType: mime || 'text/plain',
      size: file.size,
      data: text,
    };
  }

  throw new AttachmentError(`نوع الملف "${file.name}" غير مدعوم — جرّب صورة أو CSV أو Excel أو نص`);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
