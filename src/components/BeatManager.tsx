import React from 'react';
import { FaCircle, FaRegCircle, FaPlus, FaMinus } from 'react-icons/fa6';

interface BeatManagerProps {
    selectedSounds: { [key: string]: number };
    handleSwitchSound: (index: number) => void;
    handleAddBeat: () => void;
    handleRemoveBeat: () => void;
}

const BeatManager: React.FC<BeatManagerProps> = ({ selectedSounds, handleSwitchSound, handleAddBeat, handleRemoveBeat }) => { // Component to manage beats, allows adding, removing, and switching sounds for each beat
    const objectLength = Object.keys(selectedSounds).length
    return (
        <div className={`flex flex-col ${objectLength > 5 ? 'space-y-6' : 'space-y-10'} justify-center items-center mx-auto my-10 w-fit`}>

            {objectLength > 1 ? <button
            onClick={() => handleRemoveBeat()}
            className="p-4 transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-x-125"><FaMinus /></button> : null}

            <div className={`flex flex-col ${objectLength > 4 ? 'space-y-3': 'space-y-5'}`}>
                {Object.keys(selectedSounds).map((beatKey, index) => {
                    const beatValue = selectedSounds[beatKey];

                    return (
                        <button onClick={() => handleSwitchSound(index)} key={index}>
                            {beatValue === 0 ? <FaCircle className="transition-transform duration-200 fill-rose-500 hover:scale-110" />
                                : beatValue === 1 ? <FaRegCircle className="transition-transform duration-200 rounded-full bg-zinc-50 hover:scale-110" />
                                    : <FaRegCircle className="transition-transform duration-200 rounded-full stroke-lg stroke-zinc-50 hover:scale-110" />}
                        </button>
                    );
                })}
            </div>


            {objectLength < 12 ? <button
            onClick={() => handleAddBeat()}
            
            className="p-4 transition-[transform,color] duration-200 hover:text-zinc-400 hover:scale-125"><FaPlus /></button> : null}

        </div>
    );
};

export default BeatManager;
