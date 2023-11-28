import { useState, useRef, useEffect, useMemo } from "react";
import useBufferLoader from "./hooks/useBufferLoader";
import { FaPlay, FaStop } from "react-icons/fa6";
import { FaCircle, FaRegCircle } from "react-icons/fa6";

const App: React.FC = () => {
  const context = useMemo(() => new (window.AudioContext || (window as any).webkitAudioContext)(), []);

  const audioUrls = ['./sounds/1.wav', './sounds/2.wav']
  const bufferLoader = useBufferLoader(context, audioUrls)

  const amp = context.createGain();
  amp.connect(context.destination);

  const [bpm, setBpm] = useState<number>(90);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const tapHistory = useRef<number[]>([]);
  const MAX_HISTORY_LENGTH = 3;
  const INACTIVITY_TIME = 3000;

  
  const switchMetronome = () => {
    setIsPlaying(!isPlaying);
  }
  

  useEffect(() => {
    if (isPlaying) {
      const playBeat = (buffer: AudioBuffer | null) => {
        if (buffer) {
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          if (context.state === "suspended") {
            context.resume()
          }
          source.start();
        }
      };
      const playMetronome = () => {
        const beatsPerInterval = 4; // You can adjust this based on your desired pattern
        const interval = 60 / bpm;
        let count = 0;
    
        const playNextBeat = () => {
          if (count % beatsPerInterval === 0) {
            playBeat(bufferLoader[0]); // Playing the first beat, you can modify this based on your pattern
          } else {
            playBeat(bufferLoader[1]); // Playing the second beat, adjust as needed
          }
    
          count++;
    
          if (isPlaying) {
            setTimeout(playNextBeat, interval * 1000);
          }
        };
    
        playNextBeat();
      };
      playMetronome();
      
    }
    else if (context.state === "running") {
      console.log(context);
      context.suspend()
      console.log(context);
      
      
    }
  },[isPlaying, bpm]);

  useEffect(() => {
    console.log("onContext change | useEffect - browser check");

    if (!context) {
      alert("Your browser does not support the Web Audio API. Please use a modern browser for full functionality.");
    }
    console.log("Fine");
    
  }, [context]);

  const handleBpmBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setBpm(newValue < 30 ? 30 : newValue > 300 ? 300 : newValue);
  };

  const handleTap = () => {
    const now = Date.now();
    tapHistory.current.push(now);

    requestAnimationFrame(() => {
      if (tapHistory.current.length > MAX_HISTORY_LENGTH) {
        tapHistory.current.shift();
      }

      if (tapHistory.current.length > 1) {
        const timeDifference = now - tapHistory.current[tapHistory.current.length - 2];

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
        <button
          id="control"
          className="text-center p-3 rounded-full transition-colors focus:bg-zinc-600 hover:bg-zinc-800"
          onClick={switchMetronome}
        >
          {isPlaying ? <FaStop /> : <FaPlay />}
        </button>
      </div>
    </div>
  );
};

export default App;
