"use client";

import { useEffect, useRef } from "react";
import { Board as ChessBoard } from "../games/chess/board";
import { Goban } from "../games/go/goban";
import { Grid as Connect4Grid } from "../games/connect4/grid";
import { ReversiGrid } from "../games/reversi/grid";
import { SudokuGrid } from "../games/sudoku/grid";
import { Board as TicTacToeBoard } from "../games/tictactoe/board";
import {
  CHESS_PREVIEW,
  CONNECT4_PREVIEW,
  GO_PREVIEW,
  REVERSI_PREVIEW,
  SUDOKU_PREVIEW,
  TICTACTOE_PREVIEW,
} from "../../lib/previews";

const NO_PEERS = new Set();

// Every board in here is the game's own board component, so a preview cannot
// drift from the thing it is previewing. It is inert: no pointer, no tab stop,
// and nothing for a screen reader to walk through — the link around it says
// where it goes.
function Inert({ children }) {
  const node = useRef(null);

  useEffect(() => {
    if (node.current) node.current.inert = true;
  }, []);

  return (
    <div className="preview" ref={node} aria-hidden="true">
      {children}
    </div>
  );
}

export function GamePreview({ gameId }) {
  if (gameId === "chess") {
    return (
      <Inert>
        <ChessBoard
          board={CHESS_PREVIEW.board}
          orientation="w"
          interactive={false}
          drag={false}
          lastMove={CHESS_PREVIEW.lastMove}
        />
      </Inert>
    );
  }

  if (gameId === "go") {
    return (
      <Inert>
        <Goban
          board={GO_PREVIEW.board}
          size={GO_PREVIEW.size}
          turn="b"
          last={GO_PREVIEW.last}
          disabled
        />
      </Inert>
    );
  }

  if (gameId === "connect4") {
    return (
      <Inert>
        <Connect4Grid
          board={CONNECT4_PREVIEW.board}
          last={CONNECT4_PREVIEW.last}
          onDrop={() => {}}
          disabled
        />
      </Inert>
    );
  }

  if (gameId === "reversi") {
    return (
      <Inert>
        <ReversiGrid
          board={REVERSI_PREVIEW.board}
          turn="b"
          last={REVERSI_PREVIEW.last}
          disabled
        />
      </Inert>
    );
  }

  if (gameId === "sudoku") {
    return (
      <Inert>
        <div className="sud__boardwrap">
          <SudokuGrid
            values={SUDOKU_PREVIEW.values}
            notes={SUDOKU_PREVIEW.notes}
            given={SUDOKU_PREVIEW.given}
            wrong={NO_PEERS}
            selected={null}
            peers={NO_PEERS}
            selectedValue={0}
          />
        </div>
      </Inert>
    );
  }

  if (gameId === "tictactoe") {
    return (
      <Inert>
        <TicTacToeBoard board={TICTACTOE_PREVIEW.board} line={null} onPlay={() => {}} disabled />
      </Inert>
    );
  }

  return null;
}
