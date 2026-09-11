import { Parlour } from "../../../components/board/parlour";

export const metadata = { title: "Your room — BrainBox" };

export default async function RoomPage({ params }) {
  const { code } = await params;
  return <Parlour code={String(code).toUpperCase()} />;
}
