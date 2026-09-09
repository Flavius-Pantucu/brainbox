import { notFound } from "next/navigation";
import { PlayFrame } from "../../../components/board/play-frame";
import { GAMES, GAME_BY_ID } from "../../../lib/games";

export function generateStaticParams() {
  return GAMES.map((game) => ({ game: game.slug }));
}

export async function generateMetadata({ params }) {
  const { game: slug } = await params;
  const game = GAME_BY_ID[slug];
  return { title: game ? `${game.name} — BrainBox` : "BrainBox" };
}

export default async function PlayPage({ params }) {
  const { game: slug } = await params;
  if (!GAME_BY_ID[slug]) notFound();
  return <PlayFrame gameId={slug} />;
}
