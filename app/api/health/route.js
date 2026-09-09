// Backend entry point. Every folder under app/api with a route.js becomes a
// server-side endpoint, so the API can grow here alongside the board.
export function GET() {
  return Response.json({ status: "ok" });
}
