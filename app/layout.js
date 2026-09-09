import { Archivo, Big_Shoulders, Big_Shoulders_Stencil } from "next/font/google";
import "./globals.css";
import { Rail } from "../components/board/rail";

const text = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-text",
  display: "swap",
});

const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const stencil = Big_Shoulders_Stencil({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-stencil",
  display: "swap",
});

export const metadata = {
  title: "GameHub — the club board",
  description:
    "Chess, sudoku and tic-tac-toe on one hand-operated board that keeps your run, your bests and today's challenge.",
  icons: { icon: "/images/favicon.ico" },
};

export const viewport = {
  themeColor: "#0c1725",
};

// Set the paint before the first frame so the board never flashes the wrong coat.
const PAINT_BOOT = `(function(){try{var p=localStorage.getItem('gamehub.paint');if(!p){p=window.matchMedia('(prefers-color-scheme: light)').matches?'day':'night';}document.documentElement.dataset.paint=p;}catch(e){document.documentElement.dataset.paint='night';}})();`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-paint="night"
      className={`${text.variable} ${display.variable} ${stencil.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PAINT_BOOT }} />
      </head>
      <body>
        <div className="board">
          <Rail />
          <main className="board__main">{children}</main>
          <footer className="foot">
            <div className="foot__inner">
              <span>GameHub — three games, one board</span>
              <span>Everything here is kept in this browser</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
