import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";
import { Rail } from "../components/board/rail";

// Nunito carries the reading: humanist, rounded terminals, friendly at small
// sizes and still precise enough for figures.
const text = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-text",
  display: "swap",
});

// Fredoka is the voice: geometric, soft-cornered, curvy. Held to 400-600 so the
// display never shouts.
const display = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "BrainBox — the club board",
  description:
    "Chess, sudoku and tic-tac-toe on one board that keeps your run, your bests and today's challenge.",
};

export const viewport = {
  themeColor: "#0c1725",
};

// Set the paint before the first frame so the board never flashes the wrong
// coat. The old key is read once so a returning player keeps their choice.
const PAINT_BOOT = `(function(){try{var p=localStorage.getItem('brainbox.paint')||localStorage.getItem('gamehub.paint');if(!p){p=window.matchMedia('(prefers-color-scheme: light)').matches?'day':'night';}document.documentElement.dataset.paint=p;}catch(e){document.documentElement.dataset.paint='night';}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-paint="night"
      className={`${text.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PAINT_BOOT }} />
      </head>
      <body>
        <div className="board">
          <Rail />
          <main className="board__main">{children}</main>
          <footer className="foot">
            <div className="foot__inner">
              <span>BrainBox — three games, one board</span>
              <span>Everything here is kept in this browser</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
