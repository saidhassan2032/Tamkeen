export function createSSEStream(
  handler: (send: (data: object) => void, close: () => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      try {
        await handler(send, close);
      } catch (err: any) {
        console.error('[createSSEStream] Unhandled error:', err?.message ?? err);
        console.error('[createSSEStream] Stack:', err?.stack);
        send({ type: 'error', message: 'حدث خطأ في الاتصال، حاول مجدداً' });
        close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}

export async function consumeSSE(
  url: string,
  body: object,
  onChunk: (data: any) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    onChunk({ type: 'error', message: 'حدث خطأ في الاتصال، حاول مجدداً' });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const trimmed = event.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      try {
        onChunk(JSON.parse(payload));
      } catch {}
    }
  }
}
