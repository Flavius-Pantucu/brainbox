export default function Square(props) {
  const wMove = props.white;
  const bMove = props.black;
  const index = props.index;

  const xAxis = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const yAxis = ["8", "7", "6", "5", "4", "3", "2", "1"];

  const whitePieces = {
    king: "\u{2654}",
    queen: "\u{2655}",
    rook: "\u{2656}",
    bishop: "\u{2657}",
    knight: "\u{2658}",
    pawn: "\u{2659}",
  };
  const blackPieces = {
    king: "\u{265A}",
    queen: "\u{265B}",
    rook: "\u{265C}",
    bishop: "\u{265D}",
    knight: "\u{265E}",
    pawn: "\u{265F}",
  };
  return (
    <div className='flex'>
      <div className='text-gray-300 text-center bg-gray-600 border-r-[1px] border-r-gray-500 w-1/5'>
        {1 + Math.floor(index / 2)}
      </div>
      <div className='w-full flex'>
        <div className='w-1/2 pl-2 text-gray-300'>
          {wMove
            ? wMove.special == false
              ? whitePieces[wMove.piece] +
                xAxis[wMove.new_x] +
                yAxis[wMove.new_y]
              : wMove.special == "capture" || wMove.special == "empassant"
              ? whitePieces[wMove.piece] +
                xAxis[wMove.old_x] +
                "x" +
                xAxis[wMove.new_x] +
                yAxis[wMove.new_y]
              : wMove.special == "short-castle"
              ? whitePieces[wMove.piece] + "O-O"
              : wMove.special == "long-castle"
              ? whitePieces[wMove.piece] + "O-O-O"
              : ""
            : ""}
        </div>
        <div className='w-1/2 pl-2 text-gray-300'>
          {bMove
            ? bMove.special == false
              ? blackPieces[bMove.piece] +
                xAxis[bMove.new_x] +
                yAxis[bMove.new_y]
              : bMove.special == "capture" || bMove.special == "empassant"
              ? blackPieces[bMove.piece] +
                xAxis[bMove.old_x] +
                "x" +
                xAxis[bMove.new_x] +
                yAxis[bMove.new_y]
              : bMove.special == "short-castle"
              ? blackPieces[bMove.piece] + "O-O"
              : bMove.special == "long-castle"
              ? blackPieces[bMove.piece] + "O-O-O"
              : ""
            : ""}
        </div>
      </div>
    </div>
  );
}
