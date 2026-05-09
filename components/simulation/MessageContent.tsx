'use client';

import { useState, Fragment } from 'react';
import { FileText, Table2, Image as ImageIcon, ChevronDown } from 'lucide-react';
import type { Attachment } from '@/types';
import { formatFileSize } from '@/lib/files';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  attachments?: Attachment[];
  light?: boolean;
}

const CODE_FENCE = /```([\w-]*)?\n?([\s\S]*?)```/g;
const INLINE_CODE = /`([^`\n]+)`/g;

export function MessageContent({ text, attachments, light }: Props) {
  const segments: Array<{ kind: 'text' | 'code'; lang?: string; value: string }> = [];
  let last = 0;
  CODE_FENCE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CODE_FENCE.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ kind: 'text', value: text.slice(last, match.index) });
    }
    segments.push({ kind: 'code', lang: match[1] || '', value: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: 'text', value: text.slice(last) });
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, i) =>
        seg.kind === 'code' ? (
          <CodeBlock key={i} lang={seg.lang || ''} code={seg.value} />
        ) : (
          <InlineText key={i} text={seg.value} light={light} />
        ),
      )}
      {attachments?.map((att, i) => (
        <AttachmentView key={`att-${i}`} attachment={att} />
      ))}
    </div>
  );
}

function InlineText({ text, light }: { text: string; light?: boolean }) {
  if (!text.trim()) return null;
  const parts: Array<{ inline: boolean; value: string }> = [];
  let last = 0;
  INLINE_CODE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_CODE.exec(text)) !== null) {
    if (m.index > last) parts.push({ inline: false, value: text.slice(last, m.index) });
    parts.push({ inline: true, value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ inline: false, value: text.slice(last) });

  return (
    <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
      {parts.map((p, i) =>
        p.inline ? (
          <code
            key={i}
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-mono',
              light ? 'bg-white/20 text-white' : 'bg-tamkeen-surface2 text-tamkeen-blue',
            )}
          >
            {p.value}
          </code>
        ) : (
          <Fragment key={i}>{p.value}</Fragment>
        ),
      )}
    </p>
  );
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/\n$/, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="rounded-lg overflow-hidden border border-tamkeen-border bg-[#0d1117]" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 bg-tamkeen-surface2 border-b border-tamkeen-border">
        <span className="text-[10px] font-mono text-tamkeen-muted uppercase">{lang || 'code'}</span>
        <button
          onClick={copy}
          className="text-[10px] text-tamkeen-muted hover:text-tamkeen-blue transition-colors"
        >
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code className="font-mono text-tamkeen-text">{trimmed}</code>
      </pre>
    </div>
  );
}

function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (attachment.type === 'image') {
    const src = `data:${attachment.mediaType};base64,${attachment.data}`;
    return (
      <div className="rounded-lg overflow-hidden border border-tamkeen-border max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={attachment.name} className="w-full h-auto block" />
        <div className="px-2 py-1 bg-tamkeen-surface2 text-[10px] text-tamkeen-muted flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" />
          <span className="truncate flex-1">{attachment.name}</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }
  return <TextAttachmentView attachment={attachment} />;
}

function TextAttachmentView({ attachment }: { attachment: Attachment }) {
  const [open, setOpen] = useState(false);
  const isCsv = attachment.mediaType === 'text/csv' || attachment.name.toLowerCase().endsWith('.csv');
  const Icon = isCsv ? Table2 : FileText;
  const preview = attachment.data.split('\n').slice(0, 8).join('\n');
  const hasMore = attachment.data.split('\n').length > 8;

  return (
    <div className="rounded-lg border border-tamkeen-border bg-tamkeen-surface2 max-w-md">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 flex items-center gap-2 text-right hover:bg-tamkeen-surface transition-colors"
      >
        <Icon className="w-4 h-4 text-tamkeen-blue shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{attachment.name}</div>
          <div className="text-[10px] text-tamkeen-muted">{formatFileSize(attachment.size)}</div>
        </div>
        <ChevronDown className={cn('w-3.5 h-3.5 text-tamkeen-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <pre className="border-t border-tamkeen-border p-2 text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto" dir="ltr">
          {open ? attachment.data : preview}
          {!open && hasMore && '\n...'}
        </pre>
      )}
    </div>
  );
}
