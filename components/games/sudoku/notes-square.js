import { useEffect } from "react";

export default function NotesSquare(props) {
  const theme = props.theme;
  const notes = props.notes;
  const currentValue = props.currentValue;

  return (
    <div className="w-full h-full p-1.5">
      <div className="w-full h-full grid grid-cols-3 grid-rows-3">
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 1
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.one ? "1" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 2
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.two ? "2" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 3
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.three ? "3" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 4
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.four ? "4" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 5
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.five ? "5" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 6
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.six ? "6" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 7
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.seven ? "7" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 8
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.eight ? "8" : ""}
        </div>
        <div
          className={`font-mono self-center justify-self-center transition-all duration-300 ease-in-out
        ${
          currentValue == 9
            ? theme == "dark"
              ? "font-bold text-sm text-gray-200/90"
              : "font-bold text-sm text-gray-500/90"
            : theme == "dark"
            ? "text-xs text-gray-300/70"
            : "text-xs text-gray-500/70"
        }`}>
          {notes.nine ? "9" : ""}
        </div>
      </div>
    </div>
  );
}
