import {memo} from 'react';
import { FaCircle, FaRegCircle, FaRegCircleDot } from 'react-icons/fa6';

const Beat = memo(({ beat, beatIndex, handleSwitchSound }:
    { beat: number[]; beatIndex: number; handleSwitchSound: (beatIndex: number, tickIndex: number) => void; }) => {
    return (
        <div key={beatIndex} className={`flex flex-col justify-center items-center`}>
            {beat.map((tick, tickIndex) => {
                return (
                    <button className="p-4" onClick={() => handleSwitchSound(beatIndex, tickIndex)} key={tickIndex}>
                        {tick === 0 ? <FaCircle className="transition-transform duration-200 fill-rose-500 hover:scale-110" />
                            : tick === 1 ? <FaRegCircle className="transition-transform duration-200 rounded-full bg-zinc-50 hover:scale-110" />
                                : <FaRegCircleDot className="transition-transform duration-200 rounded-full stroke-md stroke-zinc-50 hover:scale-110" />}
                    </button>
                );
            })}
        </div>
    );
})

export default Beat;