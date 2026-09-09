import { getRoom, publicState, watch } from "../../../../../lib/rooms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-sent events: the room pushes every change to both players, so neither
// browser has to poll.
export async function GET(request, { params }) {
  const { code } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const room = getRoom(code);
  if (!room) return new Response("room not found", { status: 404 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let open = true;

      const push = (payload) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          open = false;
        }
      };

      push(publicState(room, token));

      const unwatch = watch(code, (updated) => push(publicState(updated, token)));

      const beat = setInterval(() => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(": beat\n\n"));
        } catch {
          open = false;
        }
      }, 25000);

      const close = () => {
        if (!open) return;
        open = false;
        clearInterval(beat);
        unwatch();
        try {
          controller.close();
        } catch {
          // already closed by the client going away
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
