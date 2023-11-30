import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import useBufferLoader from "./hooks/useBufferLoader";
import { FaPlay, FaStop } from "react-icons/fa6";
import { FaCircle, FaRegCircle } from "react-icons/fa6";

const App: React.FC = () => {
  const audioCtx = useRef(new (window.AudioContext || (window as any).webkitAudioContext)());

  const audioUrls = ['./sounds/1.wav', './sounds/2.wav']
  const bufferLoader = useBufferLoader(audioCtx.current, audioUrls)

  const amp = audioCtx.current.createGain();
  amp.connect(audioCtx.current.destination);

  const [bpm, setBpm] = useState<number>(90);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const tapHistory = useRef<number[]>([]);
  const MAX_HISTORY_LENGTH = 3;
  const INACTIVITY_TIME = 3000;


  const scheduleAheadTime = 0.1; // Schedule beats slightly ahead of current time
  const nextNoteTimeRef = useRef(0);
  let timerID: any;

  
  const stopMetronome = useCallback(() => {
    setIsPlaying(false);
    if (audioCtx.current) {
      audioCtx.current.suspend()
    }
  }, [])
  const startMetronome = useCallback(() => {
    setIsPlaying(true);
  }, [])
  

  const playMetronome = useCallback(() => {
    const beatsPerInterval = 4;
    const interval = 60 / bpm;
    let count = 0;

    const scheduleBeat = (time: any, beatIndex: number) => {
      const buffer = beatIndex % beatsPerInterval === 0 ? bufferLoader[0] : bufferLoader[1];
      if (buffer) {
        const source = audioCtx.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.current.destination);
        source.start(time);
      }
    };

    const scheduler = () => {
      while (nextNoteTimeRef.current < audioCtx.current.currentTime + scheduleAheadTime) {
        scheduleBeat(nextNoteTimeRef.current, count);
        nextNoteTimeRef.current += interval;
        count++;
      }
      timerID = setTimeout(scheduler, interval * 1000);
    };

    if (audioCtx.current.state === "suspended") {
      audioCtx.current.resume();
    }
    nextNoteTimeRef.current = audioCtx.current.currentTime;
    scheduler();
  }, [bpm, bufferLoader]);
  useEffect(() => {
    if (isPlaying) {
      playMetronome();
    } else {
      clearTimeout(timerID);
      if (audioCtx.current.state === "running") {
        audioCtx.current.suspend();
      }
    }

    return () => clearTimeout(timerID); // Cleanup on unmount
  }, [isPlaying, playMetronome]);

  useEffect(() => {
    console.log("onaudioCtx.current change | useEffect - browser check");

    if (!audioCtx.current) {
      alert("Your browser does not support the Web Audio API. Please use a modern browser for full functionality.");
    }
    console.log("Fine");
    
  }, [audioCtx.current]);

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
          onClick={isPlaying ? stopMetronome : startMetronome}
        >
          {isPlaying ? <FaStop /> : <FaPlay />}
        </button>
      </div>
    </div>
  );
};

export default App;
