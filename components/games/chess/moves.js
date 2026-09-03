import { Fragment, useRef, useEffect, useState } from "react";
import Move from "./move.js";

export default function xMoves(props) {
  const updateList = (moveList) => {
    var newList = [];
    for (var i = 0; i < moveList.length; i += 2) {
      if (i % 2 == 0 && moveList.length > 0)
        newList.push(
          <Move
            key={1 + Math.floor(i / 2)}
            index={i}
            white={moveList[i]}
            black={moveList[i + 1]}
          />
        );
      else
        newList.push(
          <Move
            key={1 + Math.floor(i / 2)}
            index={i}
            white={moveList[i]}
            black={null}
          />
        );
    }
    setMovesHistory(newList);
    console.log(moveList);
  };

  const [movesHistory, setMovesHistory] = useState([]);

  useEffect(() => {
    updateList(props.moves);
  }, [props.moves]);

  return (
    <>
      <div className='bg-gray-700 w-64 h-[90%] min-h-[384px] max-h-[384px] md:max-h-max relative'>
        <div className='h-[4%] min-h-[24px] text-gray-300 text-base font-medium bg-gray-600 border-b-gray-500 border-b-[1px] w-full grid justify-center content-center'>
          <div>Analysis</div>
        </div>
        <div className='h-[88%] xl:h-[92%] overflow-scroll scroll-smooth overflow-x-hidden no-scrollbar'>
          {movesHistory}
        </div>

        <div className='h-[4%] min-h-[32px] w-full absolute bottom-0 text-gray-300 text-2xl grid grid-cols-4 content-center'>
          <div className='flex justify-center'>
            <button>&#171;</button>
          </div>
          <div className='flex justify-center'>
            <button>&#8249;</button>
          </div>
          <div className='flex justify-center'>
            <button>&#8250;</button>
          </div>
          <div className='flex justify-center'>
            <button>&#187;</button>
          </div>
        </div>
      </div>
    </>
  );
}
