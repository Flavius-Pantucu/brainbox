import Image from "next/image";

export default function TicTacToeSquare(props) {
  const state = props.state;
  const theme = props.theme;

  if (state == "x")
    return (
      <svg
        aria-hidden="true"
        className={`xl:w-24 md:w-20 sm:w-16 w-16 xl:h-24 md:h-20 sm:h-16 h-16 flex transition-all ease-in duration-200 
        ${theme == "dark" ? "text-rose-500" : "text-rose-900"}`}
        focusable="false"
        data-prefix="fas"
        data-icon="paper-plane"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 512">
        <path
          fill="currentColor"
          d="M376.6 84.5c11.3-13.6 9.5-33.8-4.1-45.1s-33.8-9.5-45.1 4.1L192 206 56.6 43.5C45.3 29.9 25.1 28.1 11.5 39.4S-3.9 70.9 7.4 84.5L150.3 256 7.4 427.5c-11.3 13.6-9.5 33.8 4.1 45.1s33.8 9.5 45.1-4.1L192 306 327.4 468.5c11.3 13.6 31.5 15.4 45.1 4.1s15.4-31.5 4.1-45.1L233.7 256 376.6 84.5z"></path>
      </svg>
    );
  else if (state == "o")
    return (
      <svg
        aria-hidden="true"
        className={`xl:w-24 md:w-20 sm:w-16 w-16 xl:h-24 md:h-20 sm:h-16 h-16 flex transition-all ease-in duration-200
        ${theme == "dark" ? "text-cyan-300" : "text-cyan-900"}`}
        focusable="false"
        data-prefix="fas"
        data-icon="paper-plane"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 450 512">
        <path
          fill="currentColor"
          d="M224 96a160 160 0 1 0 0 320 160 160 0 1 0 0-320zM448 256A224 224 0 1 1 0 256a224 224 0 1 1 448 0z"></path>
      </svg>
    );
  else return "";
}
