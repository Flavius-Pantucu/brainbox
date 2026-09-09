import Link from "next/link";

export default function NotFound() {
  return (
    <div className="board__inner play__head" style={{ display: "block", paddingTop: 80, paddingBottom: 120 }}>
      <p className="zone-label">Nothing on this hook</p>
      <h1 className="play__title">That plate was never hung</h1>
      <p className="note" style={{ marginTop: 20 }}>
        The page you asked for is not fitted to this board. The three games and the
        standings are all reachable from the board itself.
      </p>
      <Link href="/" className="key" style={{ marginTop: 28, textDecoration: "none" }}>
        Back to the board
      </Link>
    </div>
  );
}
