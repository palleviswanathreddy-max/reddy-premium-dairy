import { sseManager } from '@/utils/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let cleanupFn: (() => void) | null = null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const listener = (payload: { event: string; data: any }) => {
        // If userId is provided, filter: only send if matches order userId or if receiver is admin
        if (userId && payload.data?.userId && payload.data.userId !== userId && userId !== 'admin') {
          return;
        }
        controller.enqueue(
          encoder.encode(`event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`)
        );
      };

      sseManager.on('message', listener);

      // Keep-alive heartbeat every 20 seconds to prevent gateways from timing out
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          // Stream might be closed
          if (cleanupFn) cleanupFn();
        }
      }, 20000);

      cleanupFn = () => {
        clearInterval(interval);
        sseManager.off('message', listener);
      };

      request.signal.addEventListener('abort', () => {
        if (cleanupFn) cleanupFn();
        try {
          controller.close();
        } catch {
          // Silently handle double-close
        }
      });
    },
    cancel() {
      if (cleanupFn) cleanupFn();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // prevent proxy buffering
    }
  });
}
