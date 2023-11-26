import { useState, useRef, useEffect } from "react";
import { FaPlay, FaStop } from "react-icons/fa6";

const App: React.FC = () => {
  const context = new AudioContext();
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.connect(amp);
  amp.connect(context.destination);

  const [bpm, setBpm] = useState<number>(30);
  const [isPlay, setIsPlay] = useState<boolean>(false)
  const tapHistory = useRef<number[]>([]);
  const MAX_HISTORY_LENGTH = 6;
  const INACTIVITY_TIME = 3000

  useEffect(() => {
    console.log("useEffect");
    if (isPlay) {
      osc.start();
    }
  })

  const handleBpmBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setBpm(newValue < 30 ? 30 : newValue > 300 ? 300 : newValue);
  };
  // todo: improve (make more accurate)
  const handleTap = () => {
    const now = Date.now();
    tapHistory.current.push(now);

    // Use requestAnimationFrame to ensure accurate timing
    requestAnimationFrame(() => {
      // Keep only the latest {MAX_HISTORY_LENGTH} timestamps
      if (tapHistory.current.length > MAX_HISTORY_LENGTH) {
        tapHistory.current.shift(); // Remove the oldest timestamp
      }

      if (tapHistory.current.length > 1) {
        const timeDifference = now - tapHistory.current[tapHistory.current.length - 2];

        // Check if the time difference is less than or equal to {INACTIVITY_TIME} seconds
        if (timeDifference <= INACTIVITY_TIME) {
          const averageTimeDifference = calculateAverageTimeDifference();

          const calculatedBpm = Math.round(60000 / averageTimeDifference);
          console.log(calculatedBpm);

          setBpm(calculatedBpm < 30 ? 30 : calculatedBpm > 300 ? 300 : calculatedBpm);
        }
      }
    });
  };

  const calculateAverageTimeDifference = () => {
    const timeDifferences = tapHistory.current.map((tap, index, arr) => {
      return index === 0 ? 0 : tap - arr[index - 1];
    });

    return timeDifferences.reduce((acc, val) => acc + val, 0) / (timeDifferences.length - 1);
  };

  const handlePlayButton = (e:React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.currentTarget.blur();
    setIsPlay(!isPlay)
    if (isPlay && osc.context.state === "running") {
      osc.stop();
     }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-900">
      <div className="flex flex-col items-center space-y-4 text-md text-zinc-50">
        <div className="text-4xl cursor-pointer block text-center rounded-lg w-32 py-6 px-8 transition-colors hover:bg-zinc-800" onClick={handleTap}>
          {bpm}
        </div>
        <div id="metronome">
          <input
            className="transparent h-[4px] w-full cursor-pointer appearance-none border-transparent bg-rose-500 dark:bg-rose-500"
            type="range"
            name="bpm"
            id=""
            min="30"
            max="300"
            value={bpm}
            onChange={handleBpmBar}
            step="1"
          />
        </div>
        <button id="control" className="text-center p-3 rounded-full transition-colors focus:bg-zinc-600 hover:bg-zinc-800" onClick={handlePlayButton}>
            {isPlay ? <FaStop /> : <FaPlay />}
        </button>
      </div>
    </div>
  );
};

export default App;
