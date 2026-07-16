import { sseManager } from '@/utils/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

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
        } catch (e) {
          // Stream might be closed
          clearInterval(interval);
          sseManager.off('message', listener);
        }
      }, 20000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        sseManager.off('message', listener);
        try {
          controller.close();
        } catch (e) {
          // Silently handle double-close
        }
      });
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
