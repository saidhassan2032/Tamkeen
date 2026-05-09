'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Loader2 } from 'lucide-react';

interface Props {
  sessionId: string;
  guidanceTips: string[];
}

export function GuidancePanel({ sessionId, guidanceTips }: Props) {
  const [loading, setLoading] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestGuidance() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      }
      const data = await res.json();
      setAiGuidance(data.guidance);
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ في الاتصال، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-tamkeen-amber" />
        <h3 className="text-sm font-semibold text-tamkeen-muted">التوجيه</h3>
      </div>

      {guidanceTips.length > 0 && (
        <ul className="space-y-1.5 mb-3 text-xs text-tamkeen-muted leading-relaxed">
          {guidanceTips.map((tip, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-tamkeen-amber">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={requestGuidance}
        disabled={loading}
        variant="outline"
        size="sm"
        className="w-full text-xs"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 ml-1.5 animate-spin" />
            جاري الطلب...
          </>
        ) : (
          <>
            <Lightbulb className="w-3.5 h-3.5 ml-1.5" />
            اطلب نصيحة من المدير
          </>
        )}
      </Button>

      {aiGuidance && (
        <div className="mt-3 p-3 bg-tamkeen-amber/10 border border-tamkeen-amber/30 rounded-md text-xs leading-relaxed whitespace-pre-wrap">
          {aiGuidance}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-tamkeen-red/10 border border-tamkeen-red/30 rounded-md text-xs text-tamkeen-red">
          {error}
        </div>
      )}
    </div>
  );
}
