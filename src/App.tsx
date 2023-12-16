import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { FaPlay, FaStop } from "react-icons/fa6";
import BeatManager from "./components/BeatManager";

interface SelectedSounds {
  [key: string]: number;
}

const soundUrls = ['./sounds/1.wav', './sounds/2.wav'];
const MAX_BEAT_IN_TIME = 12;
const MAX_HISTORY_LENGTH = 4;
const INACTIVITY_TIME = 3000;

const App: React.FC = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const amp = useRef<GainNode | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const timerIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);

  const scheduleAheadTime = 0.1;

  const [bpm, setBpm] = useState<number>(90);
  const [beats, setBeats] = useState<number>(4);

  const [selectedSounds, setSelectedSounds] = useState<SelectedSounds>(
    Array.from({ length: beats }, (_, i) => (i + 1).toString()).reduce(
      (acc, beat) => {
        acc[beat] = beat === "1" ? 0 : 1;
        return acc;
      },
      {} as SelectedSounds
    )
  );

  const soundBuffersRef = useRef<AudioBuffer[] | null>(null);

  const [isPlaying, setPlaying] = useState<boolean>(false);

  const tapHistory = useRef<number[]>([]);


  const loadBeatBuffers = async (audioContext: AudioContext, urls: string[]): Promise<AudioBuffer[]> => {
    const buffers = [];
    for (const url of urls) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      buffers.push(buffer);
    }
    return buffers;
  };


  const stopAllSources = () => {
    playingSourcesRef.current.forEach(source => {
      source.stop();
    });
    playingSourcesRef.current.clear();
  };

  const scheduleBeat = (time: number, beatNumber: number) => {
    const audioContext = audioCtx.current;

    if (!audioContext || !soundBuffersRef.current) return;

    const currentSound = selectedSounds[Object.keys(selectedSounds)[beatNumber]]
    const buffer = soundBuffersRef.current[currentSound];
    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);

    if (amp.current) {
      // todo: make adjustable
      const gainValue = beatNumber === 0 ? 2 : 1 //play gain x2 for the first beat

      amp.current.gain.setValueAtTime(gainValue, audioContext.currentTime);
      source.connect(amp.current);
      amp.current.connect(audioContext.destination);
    } else {
      source.connect(audioContext.destination);
    }

    playingSourcesRef.current.add(source);
    source.onended = () => playingSourcesRef.current.delete(source);
  };

  useEffect(() => {
    const audioContext = new AudioContext();
    audioCtx.current = audioContext;
    amp.current = audioCtx.current.createGain();
    amp.current.connect(audioCtx.current.destination);

    loadBeatBuffers(audioContext, soundUrls).then(buffers => {
      soundBuffersRef.current = buffers;
    });

    return () => {
      audioContext.close();
    };
  }, []);

  useEffect(() => {
    setSelectedSounds(prevSounds => {
      const newSounds = { ...prevSounds };
      const currentLength = Object.keys(newSounds).length;

      if (beats > currentLength) {
        // If the number of beats has increased, add new beats with default value 0
        for (let i = currentLength + 1; i <= beats; i++) {
          newSounds[i.toString()] = 0; // Ensure the key is a string
        }
      } else {
        // If the number of beats has decreased, remove the excess beats
        for (let i = currentLength; i > beats; i--) {
          delete newSounds[i.toString()]; // Ensure the key is a string
        }
      }

      return newSounds;
    });
  }, [beats]);


  useEffect(() => {
    const audioContext = audioCtx.current;

    if (!audioContext) return;

    let beatCounter = 0;

    const play = () => { // Function to start playing the beats
      if (!soundBuffersRef.current) return

      while (nextNoteTimeRef.current < audioContext.currentTime + scheduleAheadTime) { // Schedule beats within the next set time frame
        const beatKeys = Object.keys(selectedSounds);
        const currentBeat = Number(beatKeys[beatCounter % beats]) - 1;
        scheduleBeat(nextNoteTimeRef.current, currentBeat);
        nextNoteTimeRef.current += 60 / bpm / beats; // Calculate the time for the next beat based on BPM and total beats
        beatCounter++;
      }

      timerIdRef.current = window.setTimeout(play, 25); // Schedule the next call of play
    };

    if (isPlaying) {
      nextNoteTimeRef.current = audioContext.currentTime;
      beatCounter = 0;

      play();
    } else {
      if (timerIdRef.current !== null) {
        window.clearTimeout(timerIdRef.current);
      }
      stopAllSources();
    }

    return () => {
      if (timerIdRef.current !== null) {
        window.clearTimeout(timerIdRef.current);
      }
      stopAllSources();
    };
  }, [isPlaying, bpm, scheduleBeat]);


  useEffect(() => {
    console.log("onaudioCtx.current change | useEffect - browser check");

    if (!audioCtx.current) {
      alert("Your browser does not support the Web Audio API. Please use a modern browser for full functionality.");
    }

  }, []);

  const handleBpmBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setBpm(newValue < 30 ? 30 : newValue > 300 ? 300 : newValue);
    setPlaying(false)
    setPlaying(true)
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

  const switchSound = (index: number) => {
    const keys = Object.keys(selectedSounds);
    const selectedKey = keys[index];
    if (!selectedKey) {
      console.log(index);
      return;
    }

    setSelectedSounds(prevSounds => ({
      ...prevSounds,
      [selectedKey]: prevSounds[selectedKey] === 2 ? 0 : prevSounds[selectedKey] + 1
    }));
  };

  const addBeat = () => {
    if (beats === MAX_BEAT_IN_TIME) return

    setSelectedSounds(prevSounds => {
      const newBeatNumber = Object.keys(prevSounds).length + 1;
      return { ...prevSounds, [newBeatNumber.toString()]: 1 };
    });
    setBeats(beats + 1)

  };

  const removeBeat = () => {
    if (beats === 1) return

    setSelectedSounds(prevSounds => {
      const newSounds = { ...prevSounds };
      const lastBeatNumber = Object.keys(newSounds).length.toString();

      delete newSounds[lastBeatNumber];
      return newSounds;
    });
    setBeats(beats - 1)
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col items-center space-y-8 text-md text-zinc-50">
        <div className="bg-zinc-900 p-8 mb-6 rounded-2xl flex flex-col items-center">

          <div className="text-4xl cursor-pointer block text-center rounded-lg w-32 py-6 px-8 mb-6 transition-colors hover:bg-zinc-800" onClick={handleTap}>
            {bpm}
          </div>
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
        <BeatManager
          selectedSounds={selectedSounds}
          handleSwitchSound={switchSound}
          handleAddBeat={addBeat}
          handleRemoveBeat={removeBeat}
        />
        <button
          id="control"
          className="text-center p-3 rounded-full transition-colors focus:bg-zinc-600 hover:bg-zinc-800"
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? <FaStop /> : <FaPlay />}
        </button>
      </div>
    </div>
  );
};

export default App;