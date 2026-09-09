"use client";

import { useEffect, useRef } from "react";
import { Board as ChessBoard } from "../games/chess/board";
import { Goban } from "../games/go/goban";
import { Grid as Connect4Grid } from "../games/connect4/grid";
import { BackgammonBoard } from "../games/backgammon/board";
import { RemiTable } from "../games/remi/table";
import { CheckersGrid } from "../games/checkers/grid";
import { MineField } from "../games/minesweeper/grid";
import { ReversiGrid } from "../games/reversi/grid";
import { SudokuGrid } from "../games/sudoku/grid";
import { Board as TicTacToeBoard } from "../games/tictactoe/board";
import {
  BACKGAMMON_PREVIEW,
  REMI_PREVIEW,
  CHECKERS_PREVIEW,
  CHESS_PREVIEW,
  CONNECT4_PREVIEW,
  GO_PREVIEW,
  MINESWEEPER_PREVIEW,
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

  if (gameId === "remi") {
    return (
      <Inert>
        <RemiTable
          seats={REMI_PREVIEW.seats}
          names={REMI_PREVIEW.names}
          you={REMI_PREVIEW.you}
          turn={REMI_PREVIEW.turn}
          table={REMI_PREVIEW.table}
          held={REMI_PREVIEW.held}
          opened={REMI_PREVIEW.opened}
          scores={REMI_PREVIEW.scores}
          slots={REMI_PREVIEW.slots}
          discard={REMI_PREVIEW.discard}
          stock={REMI_PREVIEW.stock}
          disabled
        />
      </Inert>
    );
  }

  if (gameId === "backgammon") {
    return (
      <Inert>
        <BackgammonBoard state={BACKGAMMON_PREVIEW.state} disabled />
      </Inert>
    );
  }

  if (gameId === "checkers") {
    return (
      <Inert>
        <CheckersGrid board={CHECKERS_PREVIEW.board} disabled />
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

  if (gameId === "minesweeper") {
    return (
      <Inert>
        <MineField
          field={MINESWEEPER_PREVIEW.field}
          revealed={MINESWEEPER_PREVIEW.revealed}
          flags={MINESWEEPER_PREVIEW.flags}
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
