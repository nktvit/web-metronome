import React from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa6';
import Beat from './Beat';

interface BeatManagerProps {
    patternSounds: number[][];
    switchSound: (beatIndex: number, tickIndex: number) => void;
    handleAddTick: (beatIndex: number) => void;
    handleRemoveTick: (beatIndex: number) => void;
    handleAddBeat: () => void;
    handleRemoveBeat: () => void;
}

const BeatManager: React.FC<BeatManagerProps> = ({ patternSounds, switchSound, handleAddTick, handleRemoveTick, handleRemoveBeat, handleAddBeat }) => {
    const MAX_BEAT = 16;
    const MAX_TICK_IN_TIME = 16;

    const beatsAmount = patternSounds.length

    return (
        <div className="flex flex-row md:my-8">
            {/* Remove beat - to remove the beat (the whole line of ticks) */}
            {beatsAmount > 1 && (
                <button
                    onClick={() => handleRemoveBeat()}
                    className="p-4 mr-4 mt-16 h-fit transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-125">
                    <FaMinus />
                </button>
            )}
            <div className="flex flex-col">
                <div>
                    {patternSounds.map((beat, beatIndex) => {
                        const ticksAmount = beat.length
                        return ticksAmount > 1 ? (
                            <button
                                onClick={() => handleRemoveTick(beatIndex)}
                                key={beatIndex}
                                className="p-4 transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-x-125">
                                <FaMinus />
                            </button>
                        ) : <span className="px-6" key={beatIndex}></span>
                    })
                    }
                </div>
                <div className="flex flex-row justify-center my-4">
                    {patternSounds.map((beat, beatIndex) => {
                        return <Beat beat={beat} beatIndex={beatIndex} handleSwitchSound={switchSound} key={beatIndex} />
                    })}
                </div>

                <div>
                    {patternSounds.map((beat, beatIndex) => {
                        const ticksAmount = beat.length
                        return ticksAmount <= MAX_TICK_IN_TIME ? (
                            <button
                                onClick={() => handleAddTick(beatIndex)}
                                key={beatIndex}
                                className="p-4 transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-x-125">
                                <FaPlus />
                            </button>
                        ) : <button className="p-4 hidden" key={beatIndex}></button>
                    })
                    }
                </div>
            </div >
            {/* Add beat - to add the beat (the whole line of ticks) */}
            {beatsAmount < MAX_BEAT && (
                <button
                    onClick={() => handleAddBeat()}
                    className="p-4 ml-4 mt-16 h-fit transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-125">
                    <FaPlus />
                </button>
            )}
        </div>
    );
};

export default BeatManager;
