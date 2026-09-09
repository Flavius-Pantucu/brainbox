import { Deck } from "../components/board/deck";

export const metadata = {
  title: "GameHub — the club board",
};

export default function BoardPage() {
  return (
    <div className="board__inner">
      <Deck />
    </div>
  );
}
