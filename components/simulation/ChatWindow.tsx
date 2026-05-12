'use client';

import { useEffect, useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import { Send, Loader2, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MessageContent } from '@/components/simulation/MessageContent';
import { readFileAsAttachment, ACCEPT_ATTRIBUTE, formatFileSize, AttachmentError } from '@/lib/files';
import { MAX_ATTACHMENTS_PER_MESSAGE, type Attachment } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

interface Agent {
  id: string;
  name: string;
  roleTitle: string;
  avatarBg: string;
  avatarColor: string;
  icon: string;
}

interface Props {
  agent: Agent;
  messages: Message[];
  streamingMessage: string;
  isTyping: boolean;
  onSend: (content: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
}

export function ChatWindow({ agent, messages, streamingMessage, isTyping, onSend, disabled }: Props) {
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streamingMessage, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if ((!text && !pendingAttachments.length) || disabled || isTyping) return;
    onSend(text, pendingAttachments.length ? pendingAttachments : undefined);
    setInput('');
    setPendingAttachments([]);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    setUploadError(null);
    if (pendingAttachments.length + files.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      setUploadError(`الحد الأقصى ${MAX_ATTACHMENTS_PER_MESSAGE} ملفات في الرسالة`);
      return;
    }

    setUploading(true);
    const next: Attachment[] = [];
    for (const file of files) {
      try {
        next.push(await readFileAsAttachment(file));
      } catch (err: any) {
        setUploadError(err instanceof AttachmentError ? err.message : 'فشل قراءة الملف');
        break;
      }
    }
    if (next.length) {
      setPendingAttachments((prev) => [...prev, ...next]);
    }
    setUploading(false);
  };

  const removeAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSend = (input.trim() || pendingAttachments.length) && !disabled && !isTyping && !uploading;

  return (
    <div className="h-full flex flex-col bg-tamkeen-bg min-w-0 min-h-0">
      <div className="border-b border-tamkeen-border bg-tamkeen-surface px-6 py-4 flex items-center gap-3 shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: agent.avatarBg, color: agent.avatarColor }}
        >
          {agent.icon}
        </div>
        <div>
          <div className="font-semibold">{agent.name}</div>
          <div className="text-xs text-tamkeen-muted">{agent.roleTitle}</div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !isTyping && (
          <div className="h-full flex items-center justify-center text-tamkeen-muted text-sm text-center">
            ابدأ المحادثة مع {agent.name}
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} agent={agent} />
        ))}

        {isTyping && (
          <div className="flex gap-3 items-end">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
              style={{ backgroundColor: agent.avatarBg, color: agent.avatarColor }}
            >
              {agent.icon}
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-tamkeen-surface px-4 py-3 max-w-2xl border border-tamkeen-border">
              {streamingMessage ? (
                <MessageContent text={streamingMessage} />
              ) : (
                <div className="flex gap-1.5 py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-tamkeen-border bg-tamkeen-surface p-4 shrink-0 space-y-2">
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pendingAttachments.map((att, i) => (
              <AttachmentChip key={i} attachment={att} onRemove={() => removeAttachment(i)} />
            ))}
          </div>
        )}

        {uploadError && (
          <div className="text-xs text-tamkeen-red bg-tamkeen-red/10 border border-tamkeen-red/30 rounded-md px-3 py-2">
            {uploadError}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isTyping || uploading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            title="إرفاق ملف (صورة، Excel، CSV، نص)"
            className="shrink-0"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </Button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled || isTyping}
            placeholder={`اكتب رسالتك إلى ${agent.name}...`}
            rows={1}
            className="flex-1 resize-none bg-tamkeen-bg border border-tamkeen-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-tamkeen-blue disabled:opacity-50 max-h-32"
            style={{ fieldSizing: 'content' } as any}
          />
          <Button onClick={handleSend} disabled={!canSend} size="icon" className="shrink-0">
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const Icon = attachment.type === 'image' ? ImageIcon : FileText;
  const preview = attachment.type === 'image'
    ? `data:${attachment.mediaType};base64,${attachment.data}`
    : null;

  return (
    <div className="flex items-center gap-2 bg-tamkeen-surface2 border border-tamkeen-border rounded-lg pl-2 pr-3 py-1.5 max-w-[220px]">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={attachment.name} className="w-7 h-7 rounded object-cover shrink-0" />
      ) : (
        <Icon className="w-4 h-4 text-tamkeen-blue shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs truncate">{attachment.name}</div>
        <div className="text-[10px] text-tamkeen-muted">{formatFileSize(attachment.size)}</div>
      </div>
      <button onClick={onRemove} className="text-tamkeen-muted hover:text-tamkeen-red transition-colors shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function MessageBubble({ message, agent }: { message: Message; agent: Agent }) {
  const isUser = message.role === 'user';
  const visible = message.content.trim();

  if (isUser) {
    return (
      <div className="flex gap-3 items-end justify-end">
        <div className="rounded-2xl rounded-br-sm bg-tamkeen-blue px-4 py-3 max-w-2xl text-white">
          <MessageContent text={visible} attachments={message.attachments} light />
        </div>
        <div className="w-8 h-8 rounded-full bg-tamkeen-surface2 flex items-center justify-center text-sm shrink-0">
          أنا
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-end">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
        style={{ backgroundColor: agent.avatarBg, color: agent.avatarColor }}
      >
        {agent.icon}
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-tamkeen-surface px-4 py-3 max-w-2xl border border-tamkeen-border">
        <MessageContent text={visible} attachments={message.attachments} />
      </div>
    </div>
  );
}
