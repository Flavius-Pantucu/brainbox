import { Fragment, useRef, useEffect, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import ChessBoard from "./chessboard";
import Square from "./square";
import Moves from "./moves";

class Piece {
  constructor(image, type, color, mark, x, y) {
    this.image = image;
    this.color = color;
    this.type = type;
    this.mark = mark;
    this.x = x;
    this.y = y;
  }
}

export default function Chess(props) {
  const theme = props.theme;

  const addPieces = () => {
    const pieces = [];
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 0, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 1, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 2, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 3, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 4, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 5, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 6, 6));
    pieces.push(new Piece("/images/wP.svg", "pawn", "white", false, 7, 6));
    pieces.push(new Piece("/images/wR.svg", "rook", "white", false, 0, 7));
    pieces.push(new Piece("/images/wR.svg", "rook", "white", false, 7, 7));
    pieces.push(new Piece("/images/wN.svg", "knight", "white", false, 1, 7));
    pieces.push(new Piece("/images/wN.svg", "knight", "white", false, 6, 7));
    pieces.push(new Piece("/images/wB.svg", "bishop", "white", false, 2, 7));
    pieces.push(new Piece("/images/wB.svg", "bishop", "white", false, 5, 7));
    pieces.push(new Piece("/images/wQ.svg", "queen", "white", false, 3, 7));
    pieces.push(new Piece("/images/wK.svg", "king", "white", false, 4, 7));

    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 0, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 1, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 2, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 3, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 4, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 5, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 6, 1));
    pieces.push(new Piece("/images/bP.svg", "pawn", "black", false, 7, 1));
    pieces.push(new Piece("/images/bR.svg", "rook", "black", false, 0, 0));
    pieces.push(new Piece("/images/bR.svg", "rook", "black", false, 7, 0));
    pieces.push(new Piece("/images/bN.svg", "knight", "black", false, 1, 0));
    pieces.push(new Piece("/images/bN.svg", "knight", "black", false, 6, 0));
    pieces.push(new Piece("/images/bB.svg", "bishop", "black", false, 2, 0));
    pieces.push(new Piece("/images/bB.svg", "bishop", "black", false, 5, 0));
    pieces.push(new Piece("/images/bQ.svg", "queen", "black", false, 3, 0));
    pieces.push(new Piece("/images/bK.svg", "king", "black", false, 4, 0));

    return pieces;
  };

  const createBoard = () => {
    console.log(1);
    for (var i = 0; i < yAxis.length; i++) {
      for (var j = 0; j < xAxis.length; j++) {
        let piece = { color: null, image: null };
        pieces.forEach((p) => {
          if (p.x == j && p.y == i) {
            piece.image = p.image;
            piece.color = p.color;
          }
        });

        board.push(
          <Square
            key={`${i},${j}`}
            axis={[xAxis, yAxis]}
            mark={marks[8 * i + j]}
            piece={piece}
            coords={[i, j]}
            lastMove={lastMove}
            legalMoves={legalMoves}
            currentPiece={currentPiece}
            currentPlayer={currentPlayer}
          />
        );
      }
    }
  };

  const calculatePawnMoves = (piece, i, j, color) => {
    const legalMoves = [];
    if (color == "white") {
      //checks how many squares are available to move
      let move =
        pieces.filter((piece) => piece.x == j && piece.y == i - 1).length == 0;
      if (move) {
        legalMoves.push({ piece: piece, x: j, y: i - 1, special: false });
        move =
          pieces.filter((piece) => piece.x == j && piece.y == i - 2).length ==
          0;
        if (i == 6 && move)
          legalMoves.push({ piece: piece, x: j, y: i - 2, special: false });
      }

      //checks how many pieces are available to capture
      let capture = pieces.filter(
        (piece) =>
          (piece.x == j - 1 || piece.x == j + 1) &&
          piece.y == i - 1 &&
          piece.color == "black"
      );
      if (capture.length > 0) {
        capture.forEach((_piece) => {
          legalMoves.push({
            piece: piece,
            x: _piece.x,
            y: _piece.y,
            special: "capture",
          });
        }, legalMoves);
      }

      if (i == 3) {
        let leftPawn = pieces.filter(
          (piece) => piece.x == j - 1 && piece.y == i && piece.color == "black"
        ).length;
        let rightPawn = pieces.filter(
          (piece) => piece.x == j + 1 && piece.y == i && piece.color == "black"
        ).length;

        if (
          leftPawn == 1 &&
          lastMove.old_y == i - 2 &&
          lastMove.new_y == i &&
          lastMove.old_x == j - 1 &&
          lastMove.new_x == j - 1
        )
          legalMoves.push({
            piece: piece,
            x: j - 1,
            y: i - 1,
            special: "empassant",
          });

        if (
          rightPawn == 1 &&
          lastMove.old_y == i - 2 &&
          lastMove.new_y == i &&
          lastMove.old_x == j + 1 &&
          lastMove.new_x == j + 1
        )
          legalMoves.push({
            piece: piece,
            x: j + 1,
            y: i - 1,
            special: "empassant",
          });
      }
    } else if (color == "black") {
      //checks how many squares are available to move
      let condition =
        pieces.filter((piece) => piece.x == j && piece.y == i + 1).length == 0;
      if (condition) {
        legalMoves.push({ piece: piece, x: j, y: i + 1, special: false });
        condition =
          pieces.filter((piece) => piece.x == j && piece.y == i + 2).length ==
          0;
        if (i == 1 && condition)
          legalMoves.push({ piece: piece, x: j, y: i + 2, special: false });
      }

      //checks how many pieces are available to capture
      let capture = pieces.filter(
        (piece) =>
          (piece.x == j - 1 || piece.x == j + 1) &&
          piece.y == i + 1 &&
          piece.color == "white"
      );
      if (capture.length > 0) {
        capture.forEach((_piece) => {
          legalMoves.push({
            piece: piece,
            x: _piece.x,
            y: _piece.y,
            special: "capture",
          });
        }, legalMoves);
      }

      if (i == 4) {
        let leftPawn = pieces.filter(
          (piece) => piece.x == j - 1 && piece.y == i && piece.color == "white"
        ).length;
        let rightPawn = pieces.filter(
          (piece) => piece.x == j + 1 && piece.y == i && piece.color == "white"
        ).length;

        if (
          leftPawn == 1 &&
          lastMove[0].y == i + 2 &&
          lastMove[1].y == i &&
          lastMove[0].x == j - 1 &&
          lastMove[1].x == j - 1
        )
          legalMoves.push({
            piece: piece,
            x: j - 1,
            y: i + 1,
            special: "empassant",
          });

        if (
          rightPawn == 1 &&
          lastMove[0].y == i + 2 &&
          lastMove[1].y == i &&
          lastMove[0].x == j + 1 &&
          lastMove[1].x == j + 1
        )
          legalMoves.push({
            piece: piece,
            x: j + 1,
            y: i + 1,
            special: "empassant",
          });
      }
    } else return [];
    //promotion check
    return legalMoves;
  };

  const calculateKnightMoves = (piece, i, j, color) => {
    const legalMoves = [];

    const x_neighbors = [-2, -1, 1, 2, 2, 1, -1, -2];
    const y_neighbors = [-1, -2, -2, -1, 1, 2, 2, 1];

    for (var n = 0; n < 8; n++) {
      let move =
        pieces.filter(
          (piece) =>
            piece.x == j + x_neighbors[n] && piece.y == i + y_neighbors[n]
        ).length == 0;
      if (move)
        legalMoves.push({
          piece: piece,
          x: j + x_neighbors[n],
          y: i + y_neighbors[n],
          special: false,
        });

      let capture = pieces.filter(
        (piece) =>
          piece.x == j + x_neighbors[n] &&
          piece.y == i + y_neighbors[n] &&
          piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: j + x_neighbors[n],
          y: i + y_neighbors[n],
          special: "capture",
        });
    }

    return legalMoves;
  };

  const calculateBishopMoves = (piece, i, j, color) => {
    const legalMoves = [];
    for (
      var xAxis = j - 1, yAxis = i - 1;
      xAxis >= 0, yAxis >= 0;
      xAxis--, yAxis--
    ) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == yAxis).length ==
        0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: xAxis,
          y: yAxis,
          special: "capture",
        });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (
      var xAxis = j + 1, yAxis = i + 1;
      xAxis < 8, yAxis < 8;
      xAxis++, yAxis++
    ) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == yAxis).length ==
        0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: xAxis,
          y: yAxis,
          special: "capture",
        });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (
      var xAxis = j - 1, yAxis = i + 1;
      xAxis >= 0, yAxis < 8;
      xAxis--, yAxis++
    ) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == yAxis).length ==
        0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: xAxis,
          y: yAxis,
          special: "capture",
        });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (
      var xAxis = j + 1, yAxis = i - 1;
      xAxis < 8, yAxis >= 0;
      xAxis++, yAxis--
    ) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == yAxis).length ==
        0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: xAxis,
          y: yAxis,
          special: "capture",
        });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    return legalMoves;
  };

  const calculateRookMoves = (piece, i, j, color) => {
    const legalMoves = [];
    for (var xAxis = j - 1; xAxis >= 0; xAxis--) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == i).length == 0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: i, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == i && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({ piece: piece, x: xAxis, y: i, special: "capture" });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (var xAxis = j + 1; xAxis < 8; xAxis++) {
      let move =
        pieces.filter((piece) => piece.x == xAxis && piece.y == i).length == 0;
      if (move)
        legalMoves.push({ piece: piece, x: xAxis, y: i, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == xAxis && piece.y == i && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({ piece: piece, x: xAxis, y: i, special: "capture" });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (var yAxis = i + 1; yAxis < 8; yAxis++) {
      let move =
        pieces.filter((piece) => piece.x == j && piece.y == yAxis).length == 0;
      if (move)
        legalMoves.push({ piece: piece, x: j, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == j && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({ piece: piece, x: j, y: yAxis, special: "capture" });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    for (var yAxis = i - 1; yAxis >= 0; yAxis--) {
      let move =
        pieces.filter((piece) => piece.x == j && piece.y == yAxis).length == 0;
      if (move)
        legalMoves.push({ piece: piece, x: j, y: yAxis, special: false });

      let capture = pieces.filter(
        (piece) => piece.x == j && piece.y == yAxis && piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({ piece: piece, x: j, y: yAxis, special: "capture" });

      if (capture.length > 0 || !(move || capture.length > 0)) break;
    }
    return legalMoves;
  };

  const calculateQueenMoves = (piece, i, j, color) => {
    const b_legalMoves = [...calculateBishopMoves(piece, i, j, color)];
    const r_legalMoves = [...calculateRookMoves(piece, i, j, color)];
    return [...b_legalMoves, ...r_legalMoves];
  };

  const calculateKingMoves = (piece, i, j, color) => {
    const legalMoves = [];

    const x_neighbors = [-1, 0, 1, 1, 1, 0, -1, -1];
    const y_neighbors = [-1, -1, -1, 0, 1, 1, 1, 0];

    for (var n = 0; n < 8; n++) {
      let move =
        pieces.filter(
          (piece) =>
            piece.x == j + x_neighbors[n] && piece.y == i + y_neighbors[n]
        ).length == 0;
      if (move)
        legalMoves.push({
          piece: piece,
          x: j + x_neighbors[n],
          y: i + y_neighbors[n],
          special: false,
        });

      let capture = pieces.filter(
        (piece) =>
          piece.x == j + x_neighbors[n] &&
          piece.y == i + y_neighbors[n] &&
          piece.color != color
      );
      if (capture.length > 0)
        legalMoves.push({
          piece: piece,
          x: j + x_neighbors[n],
          y: i + y_neighbors[n],
          special: "capture",
        });
    }

    const row = color == "white" ? 7 : 0;

    const kingMove =
      movesHistory.filter(
        (move) => move.piece == "king" && move.player == color
      ).length != 0;

    const leftRookMove =
      movesHistory.filter(
        (move) =>
          move.piece == "rook" &&
          move.player == color &&
          move.old_x == 0 &&
          move.old_y == row
      ).length != 0;

    const rightRookMove =
      movesHistory.filter(
        (move) =>
          move.piece == "rook" &&
          move.player == color &&
          move.old_x == 7 &&
          move.old_y == row
      ).length != 0;

    const leftSide =
      pieces.filter(
        (piece) =>
          (piece.x == 1 && piece.y == row) ||
          (piece.x == 2 && piece.y == row) ||
          (piece.x == 3 && piece.y == row)
      ).length != 0;

    const rightSide =
      pieces.filter(
        (piece) =>
          (piece.x == 5 && piece.y == row) || (piece.x == 6 && piece.y == row)
      ).length != 0;

    if (!(kingMove || leftRookMove || leftSide)) {
      legalMoves.push({ piece: piece, x: j - 2, y: i, special: "long-castle" });
    }

    if (!(kingMove || rightRookMove || rightSide)) {
      legalMoves.push({
        piece: piece,
        x: j + 2,
        y: i,
        special: "short-castle",
      });
    }
    return legalMoves;
  };

  const calculateLegalMoves = (i, j) => {
    var moves = [];
    pieces.forEach((piece) => {
      if (piece.x == j && piece.y == i) {
        switch (piece.type) {
          case "pawn":
            moves = calculatePawnMoves(piece.type, i, j, piece.color);
            break;
          case "rook":
            moves = calculateRookMoves(piece.type, i, j, piece.color);
            break;
          case "knight":
            moves = calculateKnightMoves(piece.type, i, j, piece.color);
            break;
          case "bishop":
            moves = calculateBishopMoves(piece.type, i, j, piece.color);
            break;
          case "queen":
            moves = calculateQueenMoves(piece.type, i, j, piece.color);
            break;
          case "king":
            moves = calculateKingMoves(piece.type, i, j, piece.color);
            break;
        }
      }
    }, moves);
    return moves;
  };

  const canMove = (e, chessboard) => {
    if (legalMovesRef.current == null) return false;
    const square = e.target.classList.contains("dot")
      ? e.target.parentNode
      : e.target;
    const row = Math.floor(
      (e.clientY - chessboard.offsetTop) / square.offsetHeight
    );
    const col = Math.floor(
      (e.clientX - chessboard.offsetLeft) / square.offsetWidth
    );
    const isLegal =
      legalMovesRef.current.filter((piece) => piece.x == col && piece.y == row)
        .length == 1;
    return isLegal;
  };

  const grabPiece = (e) => {
    if (e.nativeEvent.button != 0) return;
    e.target.classList.contains("mark")
      ? (selectedPieceRef.current = e.target.parentNode)
      : (selectedPieceRef.current = e.target);
    const piece = selectedPieceRef.current;
    const chessboard = chessboardRef.current;
    if (piece.classList.contains("piece")) {
      marks.fill(false);
      setMarks([...marks]);

      const x = e.clientX - piece.parentNode.offsetLeft - piece.offsetWidth / 2;
      const y = e.clientY - piece.parentNode.offsetTop - piece.offsetHeight / 2;

      const row = Math.floor(
        (e.clientY - chessboard.offsetTop) / (piece.offsetHeight + 4)
      );
      const col = Math.floor(
        (e.clientX - chessboard.offsetLeft) / (piece.offsetWidth + 4)
      );

      if (
        !pieces.filter(
          (piece) =>
            piece.x == col &&
            piece.y == row &&
            piece.color == playerTurnRef.current
        ).length
      )
        return;

      currentPiece.x == col && currentPiece.y == row
        ? setCurrentPiece({ x: col, y: row, retouch: true })
        : setCurrentPiece({ x: col, y: row, retouch: false });

      piece.style.position = "absolute";
      piece.style.left = x + "px";
      piece.style.top = y + "px";
      piece.style.zIndex = 9999;

      legalMovesRef.current = calculateLegalMoves(row, col);
      setLegalMoves([...legalMovesRef.current]);
    } else if (!canMove(e, chessboard)) {
      selectedPieceRef.current = null;
      setCurrentPiece({ x: null, y: null, retouch: false });
      setLegalMoves([]);
    }
  };

  const movePiece = (e) => {
    if (
      selectedPieceRef.current == null ||
      chessboardRef == null ||
      !pieces.filter(
        (piece) =>
          piece.x == currentPiece.x &&
          piece.y == currentPiece.y &&
          piece.color == playerTurnRef.current
      ).length
    )
      return;
    const piece = selectedPieceRef.current;
    const board = piece.parentNode.parentNode;

    const x = e.clientX - piece.parentNode.offsetLeft - piece.offsetWidth / 2;
    const y = e.clientY - piece.parentNode.offsetTop - piece.offsetHeight / 2;
    if (
      board.offsetWidth < e.clientX - board.offsetLeft ||
      e.clientX - board.offsetLeft < 0
    ) {
      piece.style.position = "relative";
      piece.style.left = "0px";
      piece.style.top = "0px";
      selectedPieceRef.current = null;
      setCurrentPiece({ x: null, y: null, retouch: false });
    } else {
      piece.style.position = "absolute";
      piece.style.left = x + "px";
      piece.style.top = y + "px";
    }
  };

  const letPiece = (e) => {
    if (
      selectedPieceRef.current == null ||
      !pieces.filter(
        (piece) =>
          piece.x == currentPiece.x &&
          piece.y == currentPiece.y &&
          piece.color == playerTurnRef.current
      ).length
    )
      return;

    const piece = selectedPieceRef.current;
    const chessboard = chessboardRef.current;

    if (e.nativeEvent.button == 0) {
      const square = e.target.classList.contains("dot")
        ? e.target.parentNode
        : e.target;

      const row = Math.floor(
        (e.clientY - chessboard.offsetTop) / square.offsetHeight
      );
      const col = Math.floor(
        (e.clientX - chessboard.offsetLeft) / square.offsetWidth
      );

      if (
        row == currentPiece.y &&
        col == currentPiece.x &&
        currentPiece.retouch == true
      ) {
        piece.style.position = "relative";
        piece.style.left = "0px";
        piece.style.top = "0px";
        selectedPieceRef.current = null;
        setCurrentPiece({ x: null, y: null, retouch: false });
        setLegalMoves([]);
        return;
      }

      if (
        legalMovesRef.current.filter((move) => move.x == col && move.y == row)
          .length == 0
      ) {
        piece.style.position = "relative";
        piece.style.left = "0px";
        piece.style.top = "0px";
      } else if (row < 8 && col < 8 && row >= 0 && col >= 0) {
        const move = legalMovesRef.current.filter(
          (move) => move.x == col && move.y == row
        )[0];
        if (move.special == "empassant") {
          const index =
            playerTurnRef.current == "black"
              ? pieces.findIndex(
                  (piece) => piece.x == col && piece.y == row - 1
                )
              : pieces.findIndex(
                  (piece) => piece.x == col && piece.y == row + 1
                );
          pieces.splice(index, 1);
          //to be added in captured pieces
          soundsRef.current[2].play();
        } else if (move.special == "short-castle") {
          const rookColor = playerTurnRef.current == "black" ? 0 : 7;
          const index = pieces.findIndex(
            (piece) => piece.x == 7 && piece.y == rookColor
          );
          pieces[index].x -= 2;
          soundsRef.current[1].play();
        } else if (move.special == "long-castle") {
          const rookColor = playerTurnRef.current == "black" ? 0 : 7;
          const index = pieces.findIndex(
            (piece) => piece.x == 0 && piece.y == rookColor
          );
          pieces[index].x += 3;
          soundsRef.current[1].play();
        } else {
          const index = pieces.findIndex(
            (piece) => piece.x == col && piece.y == row
          );
          if (index != -1) {
            pieces.splice(index, 1);
            //to be added in captured pieces
            soundsRef.current[2].play();
          } else {
            soundsRef.current[0].play();
          }
        }
        setPieces((value) => {
          const _pieces = value.map((piece) => {
            if (piece.x == currentPiece.x && piece.y == currentPiece.y) {
              piece.x = col;
              piece.y = row;
            }
            return piece;
          });
          return _pieces;
        });

        const playerMove = {
          player: playerTurnRef.current,
          piece: move.piece,
          old_x: currentPiece.x,
          old_y: currentPiece.y,
          new_x: move.x,
          new_y: move.y,
          special: move.special,
        };

        movesHistory.push(playerMove);
        setMovesHistory([...movesHistory]);

        setLastMove(playerMove);
        setCurrentPiece({ x: null, y: null, retouch: false });
        setLegalMoves([]);
        playerTurnRef.current == "white"
          ? (playerTurnRef.current = "black")
          : (playerTurnRef.current = "white");
        setCurrentPlayer(currentPlayer == "white" ? "black" : "white");
      } else {
        piece.style.position = "relative";
        piece.style.left = "0px";
        piece.style.top = "0px";
      }
    } else if (e.nativeEvent.button == 2) return;
    selectedPieceRef.current = null;
  };

  const rightClickHandler = (e) => {
    e.preventDefault();

    if (selectedPieceRef.current == null) {
      const chessboard = chessboardRef.current;

      const squareWidth = e.target.className.includes("piece")
        ? e.target.offsetWidth + 4
        : e.target.offsetWidth;
      const squareHeight = e.target.className.includes("piece")
        ? e.target.offsetHeight + 4
        : e.target.offsetHeight;

      const row = Math.floor((e.clientY - chessboard.offsetTop) / squareHeight);
      const col = Math.floor((e.clientX - chessboard.offsetLeft) / squareWidth);
      const elem = 8 * row + col;

      marks[elem] = marks[elem] == false ? true : false;
      setMarks([...marks]);

      setCurrentPiece({ x: null, y: null, retouch: false });
      setLegalMoves([]);
    } else {
      const piece = selectedPieceRef.current;
      piece.style.position = "relative";
      piece.style.left = "0px";
      piece.style.top = "0px";
      selectedPieceRef.current = null;
      setCurrentPiece({ x: null, y: null, retouch: false });
      setLegalMoves([]);
    }
  };

  const xAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const yAxis = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const board = [];

  const soundsRef = useRef(null);
  const chessboardRef = useRef(null);
  const legalMovesRef = useRef(null);
  const selectedPieceRef = useRef(null);
  const playerTurnRef = useRef("white");

  const [capturedPieces, setCapturedPieces] = useState([]);
  const [currentPiece, setCurrentPiece] = useState({
    x: null,
    y: null,
    retouch: false,
  });
  const [pieces, setPieces] = useState(addPieces());
  const [marks, setMarks] = useState(new Array(64).fill(false));
  const [legalMoves, setLegalMoves] = useState([]);
  const [movesHistory, setMovesHistory] = useState([]);
  const [lastMove, setLastMove] = useState([
    { x: null, y: null },
    { x: null, y: null },
  ]);

  const [currentPlayer, setCurrentPlayer] = useState("white");

  createBoard();

  useEffect(() => {
    soundsRef.current = new Array(3);
    soundsRef.current[0] = new Audio("/sounds/move.mp3");
    soundsRef.current[1] = new Audio("/sounds/castle.mp3");
    soundsRef.current[2] = new Audio("/sounds/capture.mp3");
  }, []);

  return (
    <>
      <div className='mx-auto h-full w-full  px-2 mt-2 sm:px-6 lg:px-8 select-none'>
        <Menu
          as='div'
          className='relative inline-block'
        >
          <div>
            <Menu.Button
              className={`inline-flex text-2xl transition-all ease-in duration-300 ${
                theme == "dark" ? "text-white" : "text-neutral-900"
              }`}
            >
              Chess
              <ChevronDownIcon className='ml-2 mt-2 h-5 w-5' />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter='transition ease-in-out duration-300'
            enterFrom='transform opacity-0 scale-0'
            enterTo='transform opacity-100 scale-100'
            leave='transition ease-in-out duration-300'
            leaveFrom='transform opacity-100 scale-100'
            leaveTo='transform opacity-0 scale-0'
          >
            <Menu.Items
              className={`absolute left-0 mt-2 ml-4 w-40 origin-top rounded-md shadow ${
                theme == "dark" ? "bg-slate-800" : "bg-slate-100"
              }`}
            >
              <Menu.Item
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}
              >
                <button className='text-sm '>New game (1P)</button>
              </Menu.Item>
              <Menu.Item
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}
              >
                <button className='text-sm '>New game (2P)</button>
              </Menu.Item>
              <Menu.Item
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}
              >
                <button className='text-sm '>Analysis</button>
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
        <div className='flex justify-center h-4/6 mt-6 lg:h-5/6 lg:mt-0 space-x-4'>
          <ChessBoard
            board={board}
            chessboard={chessboardRef}
            grabPiece={grabPiece}
            letPiece={letPiece}
            movePiece={movePiece}
            rightClickHandler={rightClickHandler}
          />
          <Moves moves={movesHistory} />
        </div>
      </div>
    </>
  );
}
