import {memo} from 'react';
import {FaPlay, FaStop} from 'react-icons/fa6';

const ControlPanel = memo(({isPlaying, togglePlay, className}: {
    isPlaying: boolean,
    togglePlay: () => void,
    className?: string
}) => {
    return (
        <button
            className={`${className} text-lg p-3 rounded-full transition-[background-color] focus:bg-zinc-600 hover:bg-zinc-800`}
            onClick={togglePlay}>
            {isPlaying ? <FaStop/> : <FaPlay/>}
        </button>
    );
});

export default ControlPanel;
