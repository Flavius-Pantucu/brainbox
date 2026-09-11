// Backend entry point, and the one place that says out loud which services a
// deployment actually picked. Guessing from environment variables is how you
// end up debugging the wrong store.
import { activeDriver } from "../../../lib/rooms-store";
import { liveOn } from "../../../lib/live";

export const dynamic = "force-dynamic";

export async function GET() {
  // A store that cannot answer is the interesting case, so it is reported
  // rather than thrown.
  let rooms = "unreachable";
  try {
    rooms = await activeDriver();
  } catch (error) {
    rooms = `unreachable: ${error.message}`;
  }

  return Response.json({
    status: "ok",
    rooms,
    live: liveOn() ? "ably" : "polling",
  });
}
