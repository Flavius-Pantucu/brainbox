export default function ChessBoard(props) {
  return (
    <div
      ref={props.chessboard}
      onMouseUp={(e) => props.letPiece(e)}
      onMouseMove={(e) => props.movePiece(e)}
      onMouseDown={(e) => props.grabPiece(e)}
      onContextMenu={(e) => props.rightClickHandler(e)}
      className='grid grid-rows-[8] grid-cols-8 aspect-square h-[90%] min-h-[384px] max-h-[384px] md:max-h-max'
    >
      {props.board}
    </div>
  );
}
