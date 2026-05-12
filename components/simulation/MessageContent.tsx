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
        <AttachmentView key={`att-${i}`} attachment={att} light={light} />
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
              light ? 'bg-white/20 text-current' : 'bg-surface2 text-brand',
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
    <div className="rounded-lg overflow-hidden border border-border bg-[#0d1117] dark:bg-[#06070f]" dir="ltr">
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/10">
        <span className="text-[10px] font-mono text-white/60 uppercase">{lang || 'code'}</span>
        <button
          onClick={copy}
          className="text-[10px] text-white/60 hover:text-white transition-colors"
        >
          {copied ? 'تم النسخ' : 'نسخ'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed">
        <code className="font-mono text-white/90">{trimmed}</code>
      </pre>
    </div>
  );
}

function AttachmentView({ attachment, light }: { attachment: Attachment; light?: boolean }) {
  if (attachment.type === 'image') {
    const src = `data:${attachment.mediaType};base64,${attachment.data}`;
    return (
      <div
        className={cn(
          'rounded-lg overflow-hidden border max-w-sm',
          light ? 'border-white/20' : 'border-border',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={attachment.name} className="w-full h-auto block" />
        <div
          className={cn(
            'px-2 py-1 text-[10px] flex items-center gap-1.5',
            light ? 'bg-white/15 text-white/80' : 'bg-surface2 text-text-muted',
          )}
        >
          <ImageIcon className="w-3 h-3" />
          <span className="truncate flex-1">{attachment.name}</span>
          <span>{formatFileSize(attachment.size)}</span>
        </div>
      </div>
    );
  }
  return <TextAttachmentView attachment={attachment} light={light} />;
}

function TextAttachmentView({ attachment, light }: { attachment: Attachment; light?: boolean }) {
  const [open, setOpen] = useState(false);
  const isCsv = attachment.mediaType === 'text/csv' || attachment.name.toLowerCase().endsWith('.csv');
  const Icon = isCsv ? Table2 : FileText;
  const preview = attachment.data.split('\n').slice(0, 8).join('\n');
  const hasMore = attachment.data.split('\n').length > 8;

  return (
    <div
      className={cn(
        'rounded-lg border max-w-md',
        light ? 'border-white/20 bg-white/10' : 'border-border bg-surface2',
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full px-3 py-2 flex items-center gap-2 text-right transition-colors',
          light ? 'hover:bg-white/10' : 'hover:bg-surface',
        )}
      >
        <Icon className={cn('w-4 h-4 shrink-0', light ? 'text-current' : 'text-brand')} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">{attachment.name}</div>
          <div className={cn('text-[10px]', light ? 'opacity-75' : 'text-text-muted')}>
            {formatFileSize(attachment.size)}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            light ? 'opacity-75' : 'text-text-muted',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <pre
          className={cn(
            'border-t p-2 text-[10px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto',
            light ? 'border-white/20' : 'border-border',
          )}
          dir="ltr"
        >
          {open ? attachment.data : preview}
          {!open && hasMore && '\n...'}
        </pre>
      )}
    </div>
  );
}
