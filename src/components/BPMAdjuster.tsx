import { memo } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import config from "../config"

const MIN_BPM = config.minBpm;
const MAX_BPM = config.maxBpm;

const BPMAdjuster = memo(({ bpm, handleBpmChange, handleTap }: { bpm: number, handleBpmChange: (newTempo: number) => void, handleTap: () => void }) => {
    return (
        <div className="p-4 md:p-8 rounded-2xl flex flex-col items-center transition-[background-color] ease-out duration-500 hover:bg-zinc-900">
            <div className="flex flex-row items-center py-4 sm:py-6">
                <button
                    onClick={() => handleBpmChange(bpm - 1)}

                    className={`${bpm > MIN_BPM ? "" : "invisible"} p-4 mr-4 h-fit transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-125`}>
                    <FaMinus />
                </button>
                <div className="text-4xl cursor-pointer block text-center rounded-lg w-32 py-6 px-8 transition-colors hover:bg-zinc-800" onClick={handleTap}>
                    {bpm}
                </div>
                <button
                    onClick={() => handleBpmChange(bpm + 1)}
                    className={`${bpm < MAX_BPM ? "" : "invisible"} p-4 ml-4 h-fit transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-125`}>
                    <FaPlus />
                </button>
            </div>

            <input
                className="transparent h-[4px] w-full mt-6 cursor-pointer appearance-none border-transparent bg-rose-500 dark:bg-rose-500"
                type="range"
                value={bpm}
                onChange={e => handleBpmChange(parseInt(e.target.value))}
                min={MIN_BPM}
                max={MAX_BPM}
                step="1"
            />
            {/* Additional UI for BPM adjustment */}
        </div>
    );
})

export default BPMAdjuster;
