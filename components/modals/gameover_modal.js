import React, { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function GameOverModal(props) {
  const exit = () => props.childSetModal("none");

  const theme = props.theme;
  const isHidden = props.isHidden;

  return (
    <div
      className={`absolute top-0 z-50 h-full w-full
         ${isHidden ? "hidden" : "block"}`}>
      <div
        className={`flex w-full h-full 
        ${theme == "dark" ? "bg-gray-900/80" : "bg-gray-900/60"}`}>
        <div
          className={`flex mx-auto my-auto w-80 h-64 rounded-lg shadow
          ${theme == "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
          <div className="px-6 py-6 lg:px-8 w-full">
            <h1
              className={`flex justify-center  mb-4 text-2xl font-bold 
              ${theme == "dark" ? "text-white" : "text-neutral-900"}`}>
              Game Over
            </h1>
            <h1
              className={`flex justify-center  mb-4 text-sm text-center font-normal 
              ${theme == "dark" ? "text-gray-300/80" : "text-gray-400"}`}>
              You have accumulated too many mistakes to continue playing.
            </h1>
            <button
              type="button"
              className={`w-full h-10  text-white bg-gradient-to-b rounded-lg text-sm px-5 mb-3 py-2.5 text-center hover:scale-110 transition-all ease-in duration-200
                ${
                  theme == "dark"
                    ? "from-cyan-500 via-cyan-600 to-cyan-700"
                    : "from-cyan-400 via-cyan-500 to-cyan-600"
                }`}>
              New game
            </button>
            <button
              type="button"
              onClick={props.resetGame}
              className={`w-full h-10 text-white bg-gradient-to-b rounded-lg text-sm px-5 py-2.5 text-center hover:scale-110 transition-all ease-in duration-200
                ${
                  theme == "dark"
                    ? "from-green-500 via-green-600 to-green-700"
                    : "from-green-400 via-green-500 to-green-600"
                }`}>
              Reset game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
