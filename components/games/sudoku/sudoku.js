import { Fragment, useRef, useEffect, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import SudokuSquare from "./sudoku-square";
import GameOverModal from "../../modals/gameover_modal";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import modulo from "modulo-x";

class Cell {
  constructor(placement, value, notes, error) {
    this.placement = placement;
    this.value = value;
    this.notes = notes;
    this.error = error;
  }
}
class Note {
  constructor() {
    this.one = false;
    this.two = false;
    this.three = false;
    this.four = false;
    this.five = false;
    this.six = false;
    this.seven = false;
    this.eight = false;
    this.nine = false;
  }

  load(note) {
    this.one = note.one;
    this.two = note.two;
    this.three = note.three;
    this.four = note.four;
    this.five = note.five;
    this.six = note.six;
    this.seven = note.seven;
    this.eight = note.eight;
    this.nine = note.nine;
  }

  deleteNotes() {
    this.one = false;
    this.two = false;
    this.three = false;
    this.four = false;
    this.five = false;
    this.six = false;
    this.seven = false;
    this.eight = false;
    this.nine = false;
  }
}

export default function Sudoku(props) {
  const createSolution = () => {
    return [
      [6, 2, 4, 9, 8, 3, 5, 1, 7],
      [9, 5, 3, 1, 7, 2, 4, 6, 8],
      [8, 7, 1, 4, 5, 6, 3, 9, 2],
      [1, 6, 5, 4, 9, 2, 3, 7, 8],
      [3, 4, 9, 6, 8, 7, 2, 1, 5],
      [7, 2, 8, 5, 1, 3, 6, 4, 9],
      [8, 3, 1, 2, 4, 9, 7, 5, 6],
      [7, 2, 4, 5, 3, 6, 8, 9, 1],
      [9, 6, 5, 1, 8, 7, 2, 3, 4],
    ];
  };

  const createGrid = () => {
    var grid = new Array(9);
    for (var i = 0; i < 9; i++) grid[i] = new Array(9);
    return [
      [
        new Cell("initial", 6, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 8, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 7, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 1, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 2, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 1, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 5, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 3, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 6, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 7, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("initial", 3, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 9, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 8, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 2, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 5, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 2, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 4, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 1, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 4, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 7, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 5, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 6, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
      ],
      [
        new Cell("initial", 9, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 8, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("empty", null, new Note(), false),
        new Cell("initial", 4, new Note(), false),
      ],
    ];
  };

  const copyGrid = (board) => {
    var copy = [];
    for (var i = 0; i < board.length; i++) {
      var square = [];
      for (var j = 0; j < board[i].length; j++) {
        const note = new Note();
        note.load(board[i][j].notes);
        square.push(
          new Cell(
            board[i][j].placement,
            board[i][j].value,
            note,
            board[i][j].error
          )
        );
      }
      copy.push(square);
    }
    return copy;
  };

  const selectCell = (cell, square, row, col, val) => {
    if (cell == null || square == null || row == null || col == null) return;
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    setCurrentElement({
      currentCell: cell,
      currentSquare: square,
      currentRow: row,
      currentColumn: col,
      currentValue: val,
    });
  };

  const isKeyNumber = (key) => {
    if (isNaN(parseInt(key))) return false;
    return true;
  };

  const isKeyArrow = (key) => {
    if (
      "ArrowUp" === key ||
      "ArrowDown" === key ||
      "ArrowLeft" === key ||
      "ArrowRight" === key
    )
      return true;
    return false;
  };

  const keyUpHandler = (event) => {
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    if (isKeyNumber(event.key)) fillCell(event.key);
    else if (isKeyArrow(event.key)) shiftCell(event.key);
  };

  const shiftCell = (key) => {
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    if (
      currentElement.currentSquare == null ||
      currentElement.currentCell == null ||
      currentElement.currentRow == null ||
      currentElement.currentColumn == null
    )
      return;

    const newCell = {
      currentCell: null,
      currentSquare: null,
      currentRow: null,
      currentColumn: null,
      currentValue: null,
    };

    switch (key) {
      case "ArrowUp":
        if (currentElement.currentCell < 3)
          newCell.currentSquare = currentElement.currentSquare - 3;
        else newCell.currentSquare = currentElement.currentSquare;
        newCell.currentCell = currentElement.currentCell - 3;
        newCell.currentRow = currentElement.currentRow - 1;
        newCell.currentColumn = currentElement.currentColumn;
        break;
      case "ArrowDown":
        if (currentElement.currentCell > 5)
          newCell.currentSquare = currentElement.currentSquare + 3;
        else newCell.currentSquare = currentElement.currentSquare;
        newCell.currentCell = currentElement.currentCell + 3;
        newCell.currentRow = currentElement.currentRow + 1;
        newCell.currentColumn = currentElement.currentColumn;
        break;
      case "ArrowRight":
        if ([2, 5, 8].includes(currentElement.currentCell))
          newCell.currentSquare = currentElement.currentSquare + 1;
        else newCell.currentSquare = currentElement.currentSquare;
        if ([2, 5, 8].includes(currentElement.currentCell))
          newCell.currentCell = currentElement.currentCell - 2;
        else newCell.currentCell = currentElement.currentCell + 1;
        if (currentElement.currentColumn == 8)
          newCell.currentSquare = currentElement.currentSquare - 2;
        newCell.currentColumn = currentElement.currentColumn + 1;
        newCell.currentRow = currentElement.currentRow;
        break;
      case "ArrowLeft":
        if ([0, 3, 6].includes(currentElement.currentCell))
          newCell.currentSquare = currentElement.currentSquare - 1;
        else newCell.currentSquare = currentElement.currentSquare;
        if ([0, 3, 6].includes(currentElement.currentCell))
          newCell.currentCell = currentElement.currentCell + 2;
        else newCell.currentCell = currentElement.currentCell - 1;
        if (currentElement.currentColumn == 0)
          newCell.currentSquare = currentElement.currentSquare + 2;
        newCell.currentColumn = currentElement.currentColumn - 1;
        newCell.currentRow = currentElement.currentRow;
        break;
    }
    newCell.currentSquare = modulo(newCell.currentSquare, 9);
    newCell.currentCell = modulo(newCell.currentCell, 9);
    newCell.currentRow = modulo(newCell.currentRow, 9);
    newCell.currentColumn = modulo(newCell.currentColumn, 9);
    newCell.currentValue =
      grid[newCell.currentSquare][newCell.currentCell].value;
    setCurrentElement(newCell);
  };

  const fillCell = (input) => {
    if (pause == true) return;

    if (
      currentElement.currentSquare == null ||
      currentElement.currentCell == null ||
      currentElement.currentRow == null ||
      currentElement.currentColumn == null
    )
      return;

    if (
      grid[currentElement.currentSquare][currentElement.currentCell]
        .placement == "initial"
    )
      return;

    const number = parseInt(input);
    if (isNaN(number)) return;

    const previousValue =
      grid[currentElement.currentSquare][currentElement.currentCell].value;

    if (notes.current == false) {
      inserValue(
        previousValue,
        number,
        currentElement.currentSquare,
        currentElement.currentCell
      );
      checkNotes(number);
    } else
      insertNote(
        number,
        currentElement.currentSquare,
        currentElement.currentCell
      );
    checkPosition();
    setGrid(copyGrid(grid));

    movesList.current.push({
      grid: copyGrid(grid),
      current: { ...currentElement },
    });
  };

  const inserValue = (prevValue, newValue, square, cell) => {
    Object.keys(grid[square][cell].notes).forEach((key) => {
      grid[square][cell].notes[key] = false;
    });
    grid[square][cell].placement = "empty";
    if (prevValue == newValue) {
      grid[square][cell].value = null;
      grid[square][cell].error = false;
    } else {
      grid[square][cell].value = newValue;
      if (solution[square][cell] != newValue) {
        setMistakes(mistakes + 1);
        gameOverRef.current += 1;
        if (gameOverRef.current == 3) {
          gameOver();
          return;
        }
      }
    }
    currentElement.currentValue = prevValue == newValue ? null : newValue;
    setCurrentElement({ ...currentElement });
  };

  const setNote = (value, square, cell, mode) => {
    switch (value) {
      case 1:
        mode == "setFalse"
          ? (grid[square][cell].notes.one = false)
          : (grid[square][cell].notes.one = !grid[square][cell].notes.one);
        break;
      case 2:
        mode == "setFalse"
          ? (grid[square][cell].notes.two = false)
          : (grid[square][cell].notes.two = !grid[square][cell].notes.two);
        break;
      case 3:
        mode == "setFalse"
          ? (grid[square][cell].notes.three = false)
          : (grid[square][cell].notes.three = !grid[square][cell].notes.three);
        break;
      case 4:
        mode == "setFalse"
          ? (grid[square][cell].notes.four = false)
          : (grid[square][cell].notes.four = !grid[square][cell].notes.four);
        break;
      case 5:
        mode == "setFalse"
          ? (grid[square][cell].notes.five = false)
          : (grid[square][cell].notes.five = !grid[square][cell].notes.five);
        break;
      case 6:
        mode == "setFalse"
          ? (grid[square][cell].notes.six = false)
          : (grid[square][cell].notes.six = !grid[square][cell].notes.six);
        break;
      case 7:
        mode == "setFalse"
          ? (grid[square][cell].notes.seven = false)
          : (grid[square][cell].notes.seven = !grid[square][cell].notes.seven);
        break;
      case 8:
        mode == "setFalse"
          ? (grid[square][cell].notes.eight = false)
          : (grid[square][cell].notes.eight = !grid[square][cell].notes.eight);
        break;
      case 9:
        mode == "setFalse"
          ? (grid[square][cell].notes.nine = false)
          : (grid[square][cell].notes.nine = !grid[square][cell].notes.nine);
        break;
    }
  };

  const insertNote = (value, square, cell) => {
    grid[square][cell].placement = "notes";
    grid[square][cell].value = null;
    grid[square][cell].error = false;
    setNote(value, square, cell, "setFlip");
  };

  const checkDigits = () => {
    digitsCount.fill(0);
    for (var i = 0; i < grid.length; i++) {
      for (var j = 0; j < grid[i].length; j++) {
        if (
          grid[i][j].placement == "initial" ||
          grid[i][j].placement == "right"
        )
          digitsCount[grid[i][j].value - 1]++;
      }
    }
    setDigitsCount([...digitsCount]);
  };

  const checkPosition = () => {
    const wrongValues = [];
    for (var i = 0; i < 9; i++) {
      for (var j = 0; j < 9; j++) {
        grid[i][j].error = false;
        if (
          grid[i][j].placement == "initial" ||
          grid[i][j].placement == "notes" ||
          grid[i][j].value == null
        )
          continue;

        if (grid[i][j].value != solution[i][j]) {
          wrongValues.push({ square: i, cell: j, value: grid[i][j].value });
          grid[i][j].placement = "wrong";
        } else grid[i][j].placement = "right";
      }
    }
    wrongValues.forEach((cell) => {
      flagMistakes(cell.square, cell.cell, cell.value);
    });
  };

  const checkNotes = (number) => {
    const square = currentElement.currentSquare;
    const row = currentElement.currentRow;
    const column = currentElement.currentColumn;

    for (var i = 0; i < 9; i++)
      if (grid[square][i].placement == "notes")
        setNote(number, square, i, "setFalse");
    for (var i = 0; i < 3; i++) {
      const upSquare = modulo(square - 3, 9);
      const downSquare = modulo(square + 3, 9);
      const columnCell = modulo(column, 3) + i * 3;
      if (grid[upSquare][columnCell].placement == "notes")
        setNote(number, upSquare, columnCell, "setFalse");
      if (grid[downSquare][columnCell].placement == "notes")
        setNote(number, downSquare, columnCell, "setFalse");

      const leftSquare = modulo(square, 3) == 2 ? square - 2 : square + 1;
      const rightSquare = modulo(square, 3) == 0 ? square + 2 : square - 1;
      const rowCell = modulo(row, 3) * 3 + i;
      if (grid[leftSquare][rowCell].placement == "notes")
        setNote(number, leftSquare, rowCell, "setFalse");
      if (grid[rightSquare][rowCell].placement == "notes")
        setNote(number, rightSquare, rowCell, "setFalse");
    }
  };

  const flagMistakes = (square, cell, value) => {
    var column = 3 * (square % 3) + (cell % 3);
    var row = 3 * Math.floor(square / 3) + Math.floor(cell / 3);

    for (var i = 0; i < 9; i++)
      grid[square][i].value == value ? (grid[square][i].error = true) : "";
    for (var i = 0; i < 3; i++) {
      const upSquare = modulo(square - 3, 9);
      const downSquare = modulo(square + 3, 9);
      const columnCell = modulo(column, 3) + i * 3;
      grid[upSquare][columnCell].value == value
        ? (grid[upSquare][columnCell].error = true)
        : "";

      grid[downSquare][columnCell].value == value
        ? (grid[downSquare][columnCell].error = true)
        : "";

      const leftSquare = modulo(square, 3) == 2 ? square - 2 : square + 1;
      const rightSquare = modulo(square, 3) == 0 ? square + 2 : square - 1;
      const rowCell = modulo(row, 3) * 3 + i;
      grid[leftSquare][rowCell].value == value
        ? (grid[leftSquare][rowCell].error = true)
        : "";

      grid[rightSquare][rowCell].value == value
        ? (grid[rightSquare][rowCell].error = true)
        : "";
    }
  };

  const startTimer = () => {
    const intervalID = setInterval(() => {
      timer.second += 1;
      if (timer.second == 60) {
        timer.second = 0;
        timer.minute += 1;
      }
      if (timer.minute == 60) {
        timer.minute = 0;
        timer.hour += 1;
      }

      setTimer({
        hour: timer.hour,
        minute: timer.minute,
        second: timer.second,
      });
    }, 1000);
    return intervalID;
  };

  const showTime = () => {
    const hour =
      timer.hour <= 9 ? "0" + timer.hour.toString() : timer.hour.toString();
    const minute =
      timer.minute <= 9
        ? "0" + timer.minute.toString()
        : timer.minute.toString();
    const second =
      timer.second <= 9
        ? "0" + timer.second.toString()
        : timer.second.toString();
    const time =
      hour == "00" ? minute + ":" + second : hour + ":" + minute + ":" + second;
    return time;
  };

  const undoMove = () => {
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    if (movesList.current.length != 1) movesList.current.pop();

    const previousState = movesList.current[movesList.current.length - 1];
    setGrid(copyGrid(previousState.grid));
    setCurrentElement({ ...previousState.current });
  };

  const eraseValue = () => {
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    if (
      currentElement.currentSquare == null ||
      currentElement.currentCell == null ||
      currentElement.currentRow == null ||
      currentElement.currentColumn == null
    )
      return;
    if (
      grid[currentElement.currentSquare][currentElement.currentCell]
        .placement == "initial"
    )
      return;

    const previousValue =
      grid[currentElement.currentSquare][currentElement.currentCell].value;
    grid[currentElement.currentSquare][currentElement.currentCell].placement =
      "empty";
    grid[currentElement.currentSquare][currentElement.currentCell].value = null;
    grid[currentElement.currentSquare][
      currentElement.currentCell
    ].error = false;
    grid[currentElement.currentSquare][
      currentElement.currentCell
    ].notes.deleteNotes();
    checkPosition(previousValue);
    setGrid(copyGrid(grid));

    currentElement.currentValue = null;
    setCurrentElement({ ...currentElement });

    movesList.current.push({
      grid: copyGrid(grid),
      current: { ...currentElement },
    });
  };

  const resetGame = () => {
    for (var i = 0; i < grid.length; i++) {
      for (var j = 0; j < grid[i].length; j++) {
        if (grid[i][j].placement != "initial") grid[i][j].value = null;
        grid[i][j].error = false;
        grid[i][j].notes.deleteNotes();
      }
    }
    setGrid(copyGrid(grid));
    setCurrentElement({
      currentCell: null,
      currentSquare: null,
      currentRow: null,
      currentColumn: null,
      currentValue: null,
    });
    setMistakes(0);
    setHints(3);
    gameOverRef.current = 0;
    setTimer({ hour: 0, minute: 0, second: 0 });
    movesList.current = [
      {
        grid: copyGrid(grid),
        current: {
          currentCell: null,
          currentSquare: null,
          currentRow: null,
          currentColumn: null,
          currentValue: null,
        },
      },
    ];
    reset.current = true;
  };

  const giveHint = () => {
    if (pause == true) return;
    if (gameOverRef.current == 3) {
      gameOver();
      return;
    }
    if (hints == 0) return;

    const emptyCells = [];
    for (var i = 0; i < 9; i++) {
      for (var j = 0; j < 9; j++) {
        if (["notes", "empty"].includes(grid[i][j].placement))
          emptyCells.push({ square: i, cell: j });
      }
    }

    if (emptyCells.length == 0) return;

    const randomCell = Math.floor(Math.random() * emptyCells.length);
    const square = emptyCells[randomCell].square;
    const cell = emptyCells[randomCell].cell;

    grid[square][cell].value = solution[square][cell];
    grid[square][cell].placement = "right";
    grid[square][cell].notes.deleteNotes();

    setGrid(copyGrid(grid));

    setCurrentElement({
      currentCell: cell,
      currentSquare: square,
      currentRow: 3 * Math.floor(square / 3) + Math.floor(cell / 3),
      currentColumn: 3 * (square % 3) + (cell % 3),
      currentValue: solution[square][cell],
    });

    movesList.current.push({
      grid: copyGrid(grid),
      current: { ...currentElement },
    });

    setHints(hints - 1);
  };

  const gameOver = () => {
    clearInterval(intervalID.current);
    setCurrentElement({
      currentCell: null,
      currentSquare: null,
      currentRow: null,
      currentColumn: null,
      currentValue: null,
    });
  };

  const pauseGame = () => {
    setPause(true);
    setCurrentElement({
      currentCell: null,
      currentSquare: null,
      currentRow: null,
      currentColumn: null,
      currentValue: null,
    });
  };

  const unpauseGame = () => {
    reset.current = true;
    setPause(false);
  };

  const [currentElement, setCurrentElement] = useState({
    currentCell: null,
    currentSquare: null,
    currentRow: null,
    currentColumn: null,
    currentValue: null,
  });
  const [difficulty, setDifficulty] = useState("Evil");
  const [notesFlag, setNotesFlag] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(3);
  const [pause, setPause] = useState(false);
  const [timer, setTimer] = useState({ hour: 0, minute: 0, second: 0 });
  const [grid, setGrid] = useState(createGrid());
  const [digitsCount, setDigitsCount] = useState(new Array(9));

  const reset = useRef(false);
  const movesList = useRef([{ grid: copyGrid(grid), current: currentElement }]);
  const intervalID = useRef(0);
  const notes = useRef(false);
  const gameOverRef = useRef(0);

  const solution = createSolution();
  const theme = props.theme;

  useEffect(() => {
    intervalID.current = startTimer();
  }, []);

  useEffect(() => {
    if (reset.current == false) return;
    clearInterval(intervalID.current);
    intervalID.current = startTimer();
    reset.current = false;
  }, [reset.current]);

  useEffect(() => {
    if (pause == false) return;
    clearInterval(intervalID.current);
  }, [pause]);

  useEffect(() => {
    checkDigits();
  }, [grid]);

  useEffect(() => {
    document.addEventListener("keyup", keyUpHandler);
    return () => {
      document.removeEventListener("keyup", keyUpHandler);
    };
  }, [currentElement]);

  return (
    <>
      <div className="mx-auto h-5/6 w-full lg:w-5/6 max-w-7xl px-2 mt-2 sm:px-6 lg:px-8 select-none">
        <Menu as="div" className="relative inline-block">
          <div>
            <Menu.Button
              className={`inline-flex text-2xl transition-all ease-in duration-300 ${
                theme == "dark" ? "text-white" : "text-neutral-900"
              }`}>
              Sudoku
              <ChevronDownIcon className="ml-2 mt-2 h-5 w-5" />
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-in-out duration-300"
            enterFrom="transform opacity-0 scale-0"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in-out duration-300"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-0">
            <Menu.Items
              className={`absolute left-0 mt-2 ml-4 w-40 origin-top rounded-md shadow ${
                theme == "dark" ? "bg-slate-800" : "bg-slate-100"
              }`}>
              <Menu.Item
                onClick={() => setDifficulty("Easy")}
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}>
                <button className="text-sm ">Easy</button>
              </Menu.Item>
              <Menu.Item
                onClick={() => setDifficulty("Medium")}
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}>
                <button className="text-sm ">Medium</button>
              </Menu.Item>
              <Menu.Item
                onClick={() => setDifficulty("Hard")}
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}>
                <button className="text-sm ">Hard</button>
              </Menu.Item>
              <Menu.Item
                onClick={() => setDifficulty("Extreme")}
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}>
                <button className="text-sm ">Extreme</button>
              </Menu.Item>
              <Menu.Item
                onClick={() => setDifficulty("Evil")}
                className={` w-full cursor-pointer text-left rounded transition-colors ease-in-out duration-300 ${
                  theme == "dark"
                    ? "text-white hover:bg-gray-700"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-300"
                }`}>
                <button className="text-sm ">Evil</button>
              </Menu.Item>
            </Menu.Items>
          </Transition>
        </Menu>
        <div className="flex justify-center h-4/6 mt-6 lg:h-5/6 lg:mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-5 xl:gap-x-4 2xl:gap-x-0">
            <div className="flex justify-between self-end w-full col-span-1 h-8 lg:col-span-5 text-sm sm:text-sm md:text-base lg:text-lg">
              <div className="flex justify-content items-center">
                <h1
                  className={`transition-all ease-in duration-200 ${
                    theme == "dark" ? "text-white/60" : "text-neutral-600/60"
                  }`}>
                  Difficulty:
                </h1>
                <h1
                  className={`ml-2 transition-all ease-in duration-200 ${
                    theme == "dark" ? "text-cyan-600" : "text-cyan-500"
                  }`}>
                  {difficulty}
                </h1>
              </div>
              <div className="flex justify-content items-center">
                <h1
                  className={`transition-all ease-in duration-200 ${
                    theme == "dark" ? "text-white/60" : "text-neutral-600/60"
                  }`}>
                  Mistakes: {mistakes}/3
                </h1>
              </div>
              <div className="flex flex-row gap-x-2 justify-content items-center">
                <div
                  className={`transition-all ease-in duration-200  
                  ${theme == "dark" ? "text-white/60" : "text-neutral-600/60"}
                  `}>
                  {showTime()}
                </div>
                <div className="transition-all duration-300 ease-in-out cursor-pointer">
                  <div
                    onClick={pause == false ? pauseGame : unpauseGame}
                    className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex justify-center items-center
                  ${
                    theme == "dark"
                      ? "bg-cyan-600 hover:bg-cyan-500 text-white/60"
                      : "bg-cyan-500 hover:bg-cyan-600 text-white/80"
                  } 
                  `}>
                    {pause == false ? (
                      <svg
                        aria-hidden="true"
                        className={`w-3 h-3 md:h-4 md:w-4`}
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="10 0 320 512">
                        <path
                          fill="currentColor"
                          d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"></path>
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className={`w-3 h-3`}
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="10 0 320 512">
                        <path
                          fill="currentColor"
                          d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"></path>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-start self-start w-full col-span-1 lg:col-span-3">
              <div className="grid grid-cols-3 relative w-96 2xl:w-[576px] xl:w-[528px] md:w-[480px] sm:w-[432px]">
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-l-2 border-t-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={0}
                    cells={grid[0]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-x-2 border-t-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={1}
                    cells={grid[1]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-r-2 border-t-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={2}
                    cells={grid[2]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-l-2 border-y-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={3}
                    cells={grid[3]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={4}
                    cells={grid[4]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-r-2 border-y-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={5}
                    cells={grid[5]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-l-2 border-b-2 
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={6}
                    cells={grid[6]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-x-2 border-b-2  
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={7}
                    cells={grid[7]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                <div
                  className={`flex items-center justify-center aspect-square 2xl:h-48 xl:h-44 md:h-40 sm:h-36 h-32 border-r-2 border-b-2  
                ${
                  theme == "dark" ? "border-slate-300" : "border-neutral-700"
                }`}>
                  <SudokuSquare
                    theme={theme}
                    square={8}
                    cells={grid[8]}
                    selectCell={selectCell}
                    pause={pause}
                    current={[
                      currentElement.currentCell,
                      currentElement.currentSquare,
                      currentElement.currentRow,
                      currentElement.currentColumn,
                      currentElement.currentValue,
                    ]}></SudokuSquare>
                </div>
                {pause == true ? (
                  <div
                    onClick={unpauseGame}
                    className={`absolute inset-0 m-auto w-16 h-16 md:w-20 md:h-20 rounded-full transition-all flex justify-center items-center duration-300 hover:scale-110 ease-in-out cursor-pointer text-white ${
                      theme == "dark"
                        ? "bg-cyan-600 hover:bg-cyan-500"
                        : "bg-cyan-500 hover:bg-cyan-600"
                    }`}>
                    <svg
                      aria-hidden="true"
                      className={`w-8 h-8 md:w-10 md:h-10`}
                      focusable="false"
                      data-prefix="fas"
                      data-icon="paper-plane"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 336 512">
                      <path
                        fill="currentColor"
                        d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"></path>
                    </svg>
                  </div>
                ) : (
                  ""
                )}
              </div>
            </div>
            <div className="flex justify-end self-start col-span-1 lg:col-span-2 2xl:w-[400px] xl:w-[352px] lg:w-[336px] md:w-[480px] sm:w-[432px] w-[384px]">
              <div className="flex flex-col w-full lg:gap-y-4">
                <div className="flex flex-row justify-between lg:h-[72px] xl:h-24 h-24 order-2 lg:order-1">
                  <div className="flex flex-col text-center">
                    <div
                      onClick={giveHint}
                      className={`flex relative justify-center items-center rounded-full lg:w-14 xl:w-[72px] 2xl:w-20 w-16 aspect-square cursor-pointer  transition-all ease-in-out duration-200
                    ${
                      theme == "dark"
                        ? "text-cyan-600 hover:text-cyan-500 bg-gray-400/10 hover:bg-gray-300/20 "
                        : "text-cyan-500 hover:text-cyan-600 bg-gray-300/20 hover:bg-gray-400/10 "
                    }`}>
                      <svg
                        aria-hidden="true"
                        className="w-10 h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10"
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-90 -90 700 700">
                        <path
                          fill="currentColor"
                          d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm177.6 62.1C192.8 334.5 218.8 352 256 352s63.2-17.5 78.4-33.9c9-9.7 24.2-10.4 33.9-1.4s10.4 24.2 1.4 33.9c-22 23.8-60 49.4-113.6 49.4s-91.7-25.5-113.6-49.4c-9-9.7-8.4-24.9 1.4-33.9s24.9-8.4 33.9 1.4zM144.4 208a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm165.8 21.7c-7.6 8.1-20.2 8.5-28.3 .9s-8.5-20.2-.9-28.3c14.5-15.5 35.2-22.3 54.6-22.3s40.1 6.8 54.6 22.3c7.6 8.1 7.1 20.7-.9 28.3s-20.7 7.1-28.3-.9c-5.5-5.8-14.8-9.7-25.4-9.7s-19.9 3.8-25.4 9.7z"></path>
                      </svg>
                      <div
                        className={`absolute inline-flex items-center justify-center w-6 h-6 text-sm  text-white rounded-full -top-1 -right-1 transition-all ease-in-out duration-500
                      ${
                        hints > 0
                          ? theme == "dark"
                            ? "bg-green-600"
                            : "bg-green-500"
                          : theme == "dark"
                          ? "bg-red-600"
                          : "bg-red-500"
                      }`}>
                        {hints}
                      </div>
                    </div>
                    <p
                      className={`text-sm mt-1  transition-all ease-in-out duration-200
                    ${theme == "dark" ? "text-gray-300" : "text-neutral-900"}`}>
                      Hint
                    </p>
                  </div>
                  <div className="flex flex-col text-center">
                    <div
                      onClick={() => {
                        setNotesFlag(!notesFlag);
                        notes.current = !notes.current;
                      }}
                      className={`flex relative justify-center items-center rounded-full lg:w-14 xl:w-[72px] 2xl:w-20 w-16 aspect-square cursor-pointer  transition-all ease-in-out duration-200
                    ${
                      theme == "dark"
                        ? "text-cyan-600 hover:text-cyan-500 bg-gray-400/10 hover:bg-gray-300/20 "
                        : "text-cyan-500 hover:text-cyan-600 bg-gray-300/20 hover:bg-gray-400/10 "
                    }`}>
                      <svg
                        aria-hidden="true"
                        className="w-10 h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10"
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-90 -90 700 700">
                        <path
                          fill="currentColor"
                          d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                      </svg>
                      <div
                        className={`absolute inline-flex items-center justify-center w-10 h-6 text-xs  text-white rounded-full -top-1 -right-1 transition-all ease-in-out duration-500 
                      ${
                        notesFlag == false
                          ? theme == "dark"
                            ? "bg-gray-400"
                            : "bg-gray-300"
                          : theme == "dark"
                          ? "bg-cyan-600"
                          : "bg-cyan-500"
                      }`}>
                        {notesFlag == false ? "Off" : "On"}
                      </div>
                    </div>
                    <p
                      className={`text-sm mt-1  transition-all ease-in-out duration-200
                    ${theme == "dark" ? "text-gray-300" : "text-neutral-900"}`}>
                      Notes
                    </p>
                  </div>
                  <div className="flex flex-col text-center">
                    <div
                      onClick={() => eraseValue()}
                      className={`flex justify-center items-center rounded-full lg:w-14 xl:w-[72px] 2xl:w-20 w-16 aspect-square cursor-pointer  transition-all ease-in-out duration-200
                    ${
                      theme == "dark"
                        ? "text-cyan-600 hover:text-cyan-500 bg-gray-400/10 hover:bg-gray-300/20 "
                        : "text-cyan-500 hover:text-cyan-600 bg-gray-300/20 hover:bg-gray-400/10 "
                    }`}>
                      <svg
                        aria-hidden="true"
                        className="w-10 h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10"
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-60 -90 700 700">
                        <path
                          fill="currentColor"
                          d="M258.7 57.4L25.4 290.7c-25 25-25 65.5 0 90.5l80 80c12 12 28.3 18.7 45.3 18.7H256h9.4H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H355.9L486.6 285.3c25-25 25-65.5 0-90.5L349.3 57.4c-25-25-65.5-25-90.5 0zM265.4 416H256l-105.4 0-80-80L195.3 211.3 332.7 348.7 265.4 416z"></path>
                      </svg>
                    </div>
                    <p
                      className={`text-sm mt-1  transition-all ease-in-out duration-200 
                    ${theme == "dark" ? "text-gray-300" : "text-neutral-900"}`}>
                      Erase
                    </p>
                  </div>
                  <div className="flex flex-col text-center ">
                    <div
                      onClick={() => undoMove()}
                      className={`flex justify-center items-center rounded-full lg:w-14 xl:w-[72px] 2xl:w-20 w-16 aspect-square cursor-pointer  transition-all ease-in-out duration-200
                    ${
                      theme == "dark"
                        ? "text-cyan-600 hover:text-cyan-500 bg-gray-400/10 hover:bg-gray-300/20 "
                        : "text-cyan-500 hover:text-cyan-600 bg-gray-300/20 hover:bg-gray-400/10 "
                    }`}>
                      <svg
                        aria-hidden="true"
                        className="w-10 h-10 lg:w-8 lg:h-8 xl:w-10 xl:h-10 rotate-45"
                        focusable="false"
                        data-prefix="fas"
                        data-icon="paper-plane"
                        role="img"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="-130 -110 700 700">
                        <path
                          fill="currentColor"
                          d="M32.5 224H24c-13.3 0-24-10.7-24-24V72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L82.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L169 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8H32.5z"></path>
                      </svg>
                    </div>
                    <p
                      className={`text-sm mt-1  transition-all ease-in-out duration-200
                    ${theme == "dark" ? "text-gray-300" : "text-neutral-900"}`}>
                      Undo
                    </p>
                  </div>
                </div>
                <div className="order-1 lg:order-2 2xl:h-[400px] xl:h-[352px] lg:h-[336px] h-20">
                  <div className="grid grid-cols-9 lg:grid-cols-3 lg:grid-rows-3 lg:gap-2 h-full content-center items-center">
                    <div
                      onClick={digitsCount[0] != 9 ? () => fillCell(1) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl lg:rounded h-full w-full 
                      ${
                        digitsCount[0] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      1
                    </div>
                    <div
                      onClick={digitsCount[1] != 9 ? () => fillCell(2) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[1] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      2
                    </div>
                    <div
                      onClick={digitsCount[2] != 9 ? () => fillCell(3) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[2] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      3
                    </div>
                    <div
                      onClick={digitsCount[3] != 9 ? () => fillCell(4) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[3] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      4
                    </div>
                    <div
                      onClick={digitsCount[4] != 9 ? () => fillCell(5) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[4] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      5
                    </div>
                    <div
                      onClick={digitsCount[5] != 9 ? () => fillCell(6) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[5] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      6
                    </div>
                    <div
                      onClick={digitsCount[6] != 9 ? () => fillCell(7) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[6] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      7
                    </div>
                    <div
                      onClick={digitsCount[7] != 9 ? () => fillCell(8) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[7] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                     ${
                       theme == "dark"
                         ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                         : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                     }`}>
                      8
                    </div>
                    <div
                      onClick={digitsCount[8] != 9 ? () => fillCell(9) : null}
                      className={`transition-colors ease-in-out duration-300 flex justify-center items-center text-5xl cursor-pointer lg:rounded h-full w-full 
                      ${
                        digitsCount[8] == 9
                          ? "opacity-0 cursor-default"
                          : "cursor-pointer"
                      }
                      ${
                        theme == "dark"
                          ? "text-cyan-600 hover:text-cyan-500 lg:bg-cyan-600 hover:lg:bg-cyan-500 lg:text-white hover:lg:text-white"
                          : "text-cyan-500 hover:text-cyan-600 lg:bg-gray-300/20 hover:lg:bg-gray-300/40"
                      }`}>
                      9
                    </div>
                  </div>
                </div>
                <div className="hidden grid-cols-2 order-3 transition-all ease-in duration-200 content-end h-10 xl:h-12 lg:grid">
                  <div
                    className={`flex justify-start  ${
                      theme == "dark" ? "text-gray-300" : "text-neutral-900"
                    }`}>
                    <button
                      type="button"
                      onClick={resetGame}
                      className={`w-full h-10 xl:h-12 text-white bg-gradient-to-b rounded-lg text-sm mr-2 px-5 py-2.5 text-center hover:scale-110 transition-all ease-in duration-200
                    ${
                      theme == "dark"
                        ? "from-green-500 via-green-600 to-green-700"
                        : "from-green-400 via-green-500 to-green-600"
                    }`}>
                      Reset game
                    </button>
                  </div>
                  <div
                    className={`flex justify-end  ${
                      theme == "dark" ? "text-gray-300" : "text-neutral-900"
                    }`}>
                    <button
                      type="button"
                      className={`w-full h-10 xl:h-12 text-white bg-gradient-to-b rounded-lg text-sm ml-2 px-5 py-2.5 text-center hover:scale-110 transition-all ease-in duration-200
                    ${
                      theme == "dark"
                        ? "from-cyan-500 via-cyan-600 to-cyan-700"
                        : "from-cyan-400 via-cyan-500 to-cyan-600"
                    }`}>
                      New game
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <GameOverModal
        isHidden={mistakes == 3 ? false : true}
        resetGame={resetGame}></GameOverModal>
    </>
  );
}
