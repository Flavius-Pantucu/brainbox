import { StandingsBoard } from "../../components/board/standings-board";

export const metadata = {
  title: "Standings — GameHub",
};

export default function StandingsPage() {
  return (
    <div className="board__inner">
      <StandingsBoard />
    </div>
  );
}
