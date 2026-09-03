// Backend entry point. Every file under pages/api becomes a server-side
// endpoint, so the API can grow here alongside the app.
export default function handler(req, res) {
  res.status(200).json({ status: "ok" });
}
