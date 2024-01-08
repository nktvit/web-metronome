import { useState, useRef, useEffect } from "react";
import BeatManager from "./components/BeatManager";
import ControlPanel from "./components/ControlPanel";
import config from './config';
import BPMAdjuster from "./components/BPMAdjuster";

const soundUrls = ['./sounds/1.wav', './sounds/2.wav'];
const MIN_BPM = config.minBpm;
const MAX_BPM = config.maxBpm;

const App: React.FC = () => {
  // Core audio states(useRef to avoid re-renders)
  const audioCtx = useRef<AudioContext | null>(null);
  const amp = useRef<GainNode | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const timerIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef(0);
  const soundBuffersRef = useRef<AudioBuffer[] | null>(null);
  const patternSoundsRef = useRef<number[][]>([[0, 1, 1, 1], [0, 1, 1, 1]]);
  const currentPosRef = useRef({ rep: 0, beat: 0 });
  const nextBpmRef = useRef(config.initialBpm);
  const tapHistory = useRef<number[]>([]);

  // both UI and functional states
  const [patternSounds, setPatternSounds] = useState<number[][]>(patternSoundsRef.current);
  const [bpm, setBpm] = useState<number>(nextBpmRef.current);
  const [isPlaying, setPlaying] = useState<boolean>(false);

  // UI states
  const [maxBeats, setMaxBeats] = useState<number>(0) //TODO: make UI shrink when amount of beats per rep exceeds 4
  const [flash, setFlash] = useState(false);


  const beats = patternSounds.length

  // Loads the beat audio files into AudioBuffers
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
    playingSourcesRef.current.forEach(source => source.stop());
    playingSourcesRef.current.clear();
  };

  const getBeatDuration = (beats: number) => {
    return 60 / nextBpmRef.current / beats;
  };

  const scheduleBeat = (time: number) => {
    const audioContext = audioCtx.current;
    if (!audioContext || !soundBuffersRef.current) return;

    const currentPatternSounds = patternSoundsRef.current;
    const { rep, beat } = currentPosRef.current;
    const beatSound = currentPatternSounds[rep][beat];

    const buffer = soundBuffersRef.current[beatSound];
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(time);


    if (amp.current) {
      // TODO: make gain adjustable in settings
      const gainValue = beatSound === 0 ? 4 : 1 // Play gain x2 for the first beat

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
    if (!audioContext || !soundBuffersRef.current) return;

    let beatIndex = 0;
    let repIndex = 0;

    const play = () => {
      const now = audioContext.currentTime;

      if (nextNoteTimeRef.current <= now) { // Skip wrong timing sounds
        const currentPattern = patternSoundsRef.current[repIndex % patternSoundsRef.current.length];
        currentPosRef.current = { rep: repIndex % patternSoundsRef.current.length, beat: beatIndex % currentPattern.length };

        if (beatIndex === 0) {
          setFlash(true);
          setTimeout(() => setFlash(false), 500);
        }

        scheduleBeat(nextNoteTimeRef.current);

        nextNoteTimeRef.current += getBeatDuration(currentPattern.length); // Recalculate next note
        beatIndex++;

        if (beatIndex >= currentPattern.length) {
          beatIndex = 0; // Reset the beat index for the next repetition
          repIndex++; // Move to the next repetition
        }
      }

      // Schedule the next call of play
      const delta = Math.max(nextNoteTimeRef.current - now, 0);
      timerIdRef.current = window.setTimeout(play, delta * 1000);
    };

    if (isPlaying) {
      nextNoteTimeRef.current = audioContext.currentTime;
      beatIndex = 0;
      repIndex = 0;
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
  }, [isPlaying]);

  useEffect(() => {
    patternSoundsRef.current = patternSounds;
  }, [patternSounds]);
  useEffect(() => {
    nextBpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    if (!audioCtx.current) {
      alert("Your browser does not support the Web Audio API. Please use a modern browser for full functionality.");
    }

    // Prevent pinch zoom
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
    };
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying(!isPlaying)
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };

  }, [isPlaying]);

  const changeTempo = (newTempo: number) => setBpm(newTempo < MIN_BPM ? MIN_BPM : newTempo > MAX_BPM ? MAX_BPM : newTempo);

  const handleTap = () => {
    vibrate()

    const now = Date.now();
    tapHistory.current.push(now);

    requestAnimationFrame(() => {
      if (tapHistory.current.length > config.maxHistoryLength) {
        tapHistory.current.shift();
      }

      if (tapHistory.current.length > 1) {
        const timeDifference = now - tapHistory.current[tapHistory.current.length - 2];

        if (timeDifference <= config.inactivityTime) {
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
    if (beats === config.maxBeat) return

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

    if (currentBeat.length === config.maxTickInTime) return

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
  function togglePlay() {
    setPlaying(!isPlaying)
  }
  // Vibration on bpm tap
  const vibrate = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate(200);
    }
};

  return (
    <div className={`flex items-center justify-center min-h-screen ${flash ? 'flash-effect' : ''} bg-black`}>
      <div className={`flex flex-col-reverse md:flex-col py-4 items-center ${maxBeats > 4 ? "md:space-y-2" : "md:space-y-6"} text-md text-zinc-50`}>
        <BPMAdjuster
          bpm={bpm}
          handleBpmChange={changeTempo}
          handleTap={handleTap}
        />
        <div id="wrap" className="flex flex-col items-center px-12 py-4 rounded-2xl transition-[background-color] ease-out duration-500 md:hover:bg-zinc-900">
          <BeatManager
            patternSounds={patternSounds}
            switchSound={switchSound}
            handleAddTick={addTick}
            handleRemoveTick={removeTick}
            handleAddBeat={addBeat}
            handleRemoveBeat={removeBeat}
          />
          <ControlPanel isPlaying={isPlaying} togglePlay={togglePlay} />
        </div>

      </div>
    </div>
  );
};

export default App;