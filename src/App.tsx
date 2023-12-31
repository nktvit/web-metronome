import { useState, useRef, useEffect } from "react";
import { FaPlay, FaStop } from "react-icons/fa6";
import BeatManager from "./components/BeatManager";

const soundUrls = ['./sounds/1.wav', './sounds/2.wav'];
const MAX_BEAT = 16;
const MAX_TICK_IN_TIME = 16;
const MAX_HISTORY_LENGTH = 4;
const INACTIVITY_TIME = 3000;
const MIN_BPM = 15;
const MAX_BPM = 300;

const App: React.FC = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const amp = useRef<GainNode | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const timerIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const soundBuffersRef = useRef<AudioBuffer[] | null>(null);
  const tapHistory = useRef<number[]>([]);

  const scheduleAheadTime = 0.1;

  const [patternSounds, setPatternSounds] = useState(
    [
      [0, 1, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 1],
      [0, 1, 1, 1],
    ]
  );

  const beats = patternSounds.length

  const [bpm, setBpm] = useState<number>(60);

  const [isPlaying, setPlaying] = useState<boolean>(false);

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

  // Play the sound
  // @params play what {beatNumber}, play when {time}

  //TODO: Refactor so that scheduleBeat accept {time} and the pointer in the patternSounds.
  // It is crucial to check the beatSound in real time so that even after soundSwitch we can play right sound on the same iteration
  // Think over how to make the code clear with this change 

  const scheduleBeat = (time: number, beatSound: number) => {
    const audioContext = audioCtx.current;

    if (!audioContext || !soundBuffersRef.current) return;

    const buffer = soundBuffersRef.current[beatSound];
    const source = audioContext.createBufferSource();

    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);

    if (amp.current) {
      // TODO: make gain adjustable in settings
      const gainValue = beatSound === 0 ? 4 : 1 //play gain x2 for the first beat

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
    const audioContext = audioCtx.current;

    if (!audioContext) return;


    const play = () => {
      if (!soundBuffersRef.current) return

      while (nextNoteTimeRef.current < audioContext.currentTime + scheduleAheadTime) {
        for (let i = 0; i < beats; i++) {
          const ticksPerBeat = patternSounds[i]
          ticksPerBeat.forEach(tick => {
            scheduleBeat(nextNoteTimeRef.current, tick);
            nextNoteTimeRef.current += 60 / bpm / ticksPerBeat.length;
          })
        }
      }

      timerIdRef.current = window.setTimeout(play, 25);
    };

    if (isPlaying) {
      nextNoteTimeRef.current = audioContext.currentTime;

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

  const changeTempo = (newTempo: number) => setBpm(newTempo < MIN_BPM ? MIN_BPM : newTempo > MAX_BPM ? MAX_BPM : newTempo);

  const handleBpmBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);

    changeTempo(newValue)

    if (isPlaying) {
      setPlaying(false)
      setPlaying(true)
    }
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

          changeTempo(calculatedBpm)
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

  function switchSound(beatIndex: number, tickIndex: number) {
    if (typeof beatIndex === 'undefined' || typeof tickIndex === 'undefined') return;

    const soundToChange = patternSounds[beatIndex][tickIndex]

    const newPattern = [...patternSounds]
    newPattern[beatIndex][tickIndex] = soundToChange === 2 ? 0 : soundToChange + 1

    setPatternSounds(newPattern);
  };

  function addBeat() {
    if (beats === MAX_BEAT) return

    const lastBeatLength = patternSounds[beats - 1].length
    const newBeat = [0, ...new Array(lastBeatLength - 1).fill(1)]

    setPatternSounds([...patternSounds, newBeat]);
  };

  function removeBeat() {
    if (beats === 1) return

    const newPattern = [...patternSounds]
    newPattern.pop()

    setPatternSounds(newPattern);
  };

  function addTick(beatIndex: number) {
    const currentBeat = patternSounds[beatIndex]

    if (currentBeat.length === MAX_TICK_IN_TIME) return

    const newBeat = [...currentBeat, 1]

    const newPattern = [...patternSounds]

    newPattern[beatIndex] = newBeat

    setPatternSounds(newPattern)
  }

  function removeTick(beatIndex: number) {
    const currentBeat = patternSounds[beatIndex]

    if (currentBeat.length === 1) return

    const newBeat = [...currentBeat]
    newBeat.pop()

    const newPattern = [...patternSounds]

    newPattern[beatIndex] = newBeat

    setPatternSounds(newPattern)
  }

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
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={handleBpmBar}
            step="1"
          />

        </div>
        <BeatManager
          patternSounds={patternSounds}
          switchSound={switchSound}
          handleAddTick={addTick}
          handleRemoveTick={removeTick}
          handleAddBeat={addBeat}
          handleRemoveBeat={removeBeat}
        />
        {/* TODO spacebar to play and stop */}
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