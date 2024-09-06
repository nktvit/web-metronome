import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import BeatManager from "./components/BeatManager";
import ControlPanel from "./components/ControlPanel";
import config from './config';
import BPMAdjuster from "./components/BPMAdjuster";

const soundUrls = ['./sounds/1.wav', './sounds/2.wav'];
const MIN_BPM = config.minBpm;
const MAX_BPM = config.maxBpm;

const App: React.FC = () => {
    const [isAudioSupported, setIsAudioSupported] = useState<boolean | null>(null);
    const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const timerIdRef = useRef<number | null>(null);
    const nextNoteTimeRef = useRef(0);
    const soundBuffersRef = useRef<AudioBuffer[] | null>(null);
    const patternSoundsRef = useRef<number[][]>([[0, 1, 1, 1], [0, 1, 1, 1]]);
    const currentPosRef = useRef({rep: 0, beat: 0});
    const nextBpmRef = useRef(config.initialBpm);
    const tapHistory = useRef<number[]>([]);

    // both UI and functional states
    const [patternSounds, setPatternSounds] = useState<number[][]>(patternSoundsRef.current);
    const [bpm, setBpm] = useState<number>(nextBpmRef.current);
    const [isPlaying, setPlaying] = useState<boolean>(false);

    // UI states
    const [maxBeats, setMaxBeats] = useState<number>(0);
    const [flash, setFlash] = useState(false);

    const beats = patternSounds.length;

    // Memoize AudioContext
    const audioContext = useMemo(() => {
        let AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            try {
                return new AudioContext();
            } catch (e) {
                console.error("Failed to create AudioContext:", e);
                return null;
            }
        }
        return null;
    }, []);

    const stopAllSources = useCallback(() => {
        playingSourcesRef.current.forEach(source => source.stop());
        playingSourcesRef.current.clear();
    }, []);

    const getBeatDuration = useCallback((beats: number) => {
        return 60 / nextBpmRef.current / beats;
    }, []);

    const scheduleBeat = useCallback((time: number) => {
        if (!audioContext || !soundBuffersRef.current) return;

        const { rep, beat } = currentPosRef.current;
        const beatSound = patternSoundsRef.current[rep][beat];
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffersRef.current[beatSound];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(beatSound === 0 ? 4 : 1, audioContext.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(time);
        playingSourcesRef.current.add(source);
        source.onended = () => playingSourcesRef.current.delete(source);

        if (beat === 0) {
            setFlash(true);
            setTimeout(() => setFlash(false), 500);
        }
    }, [audioContext]);

    const play = useCallback(() => {
        if (!audioContext) return;

        const now = audioContext.currentTime;

        while (nextNoteTimeRef.current <= now + 0.1) { // Schedule ahead by 100ms
            const currentPattern = patternSoundsRef.current[currentPosRef.current.rep];
            scheduleBeat(nextNoteTimeRef.current);

            nextNoteTimeRef.current += getBeatDuration(currentPattern.length);
            currentPosRef.current.beat++;

            if (currentPosRef.current.beat >= currentPattern.length) {
                currentPosRef.current.beat = 0;
                currentPosRef.current.rep = (currentPosRef.current.rep + 1) % patternSoundsRef.current.length;
            }
        }

        timerIdRef.current = requestAnimationFrame(play);
    }, [audioContext, scheduleBeat, getBeatDuration]);

    useEffect(() => {
        setIsAudioSupported(!!audioContext);
    }, [audioContext]);

    useEffect(() => {
        if (!audioContext || !isAudioSupported) return;

        let isMounted = true;
        const loadBuffers = async () => {
            const buffers = await Promise.all(soundUrls.map(async (url) => {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                return await audioContext.decodeAudioData(arrayBuffer);
            }));
            if (isMounted) {
                soundBuffersRef.current = buffers;
            }
        };
        loadBuffers();
        return () => { isMounted = false; };
    }, [audioContext, isAudioSupported]);

    useEffect(() => {
        if (!audioContext || !isAudioSupported) return;

        if (isPlaying) {
            nextNoteTimeRef.current = audioContext.currentTime;
            currentPosRef.current = { rep: 0, beat: 0 };
            play();
        } else {
            if (timerIdRef.current !== null) {
                cancelAnimationFrame(timerIdRef.current);
            }
            stopAllSources();
        }

        return () => {
            if (timerIdRef.current !== null) {
                cancelAnimationFrame(timerIdRef.current);
            }
            stopAllSources();
        };
    }, [isPlaying, audioContext, play, stopAllSources, isAudioSupported]);

    useEffect(() => {
        patternSoundsRef.current = patternSounds;
    }, [patternSounds]);

    useEffect(() => {
        nextBpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        const preventZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchstart', preventZoom, {passive: false});
        document.addEventListener('touchmove', preventZoom, {passive: false});

        return () => {
            document.removeEventListener('touchstart', preventZoom);
            document.removeEventListener('touchmove', preventZoom);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                e.preventDefault();
                setPlaying(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const changeTempo = useCallback((newTempo: number) => {
        setBpm(prevBpm => Math.min(Math.max(newTempo, MIN_BPM), MAX_BPM));
    }, []);

    const calculateAverageTimeDifference = useCallback(() => {
        const timeDifferences = tapHistory.current.map((tap, index, arr) => {
            return index === 0 ? 0 : tap - arr[index - 1];
        });

        return timeDifferences.reduce((acc, val) => acc + val, 0) / (timeDifferences.length - 1);
    }, []);

    const handleTap = useCallback(() => {
        vibrate();
        const now = Date.now();
        tapHistory.current = [...tapHistory.current.slice(-config.maxHistoryLength), now];

        if (tapHistory.current.length > 1) {
            const timeDifference = now - tapHistory.current[tapHistory.current.length - 2];

            if (timeDifference <= config.inactivityTime) {
                const averageTimeDifference = calculateAverageTimeDifference();
                const calculatedBpm = Math.round(60000 / averageTimeDifference);
                changeTempo(calculatedBpm);
            }
        }
    }, [changeTempo, calculateAverageTimeDifference]);

    const switchSound = useCallback((beatIndex: number, tickIndex: number) => {
        if (typeof beatIndex === 'undefined' || typeof tickIndex === 'undefined') return;

        setPatternSounds(prevSounds => {
            const newPattern = [...prevSounds];
            const soundToChange = newPattern[beatIndex][tickIndex];
            newPattern[beatIndex][tickIndex] = soundToChange === 2 ? 0 : soundToChange + 1;
            return newPattern;
        });
    }, []);

    const addBeat = useCallback(() => {
        if (beats === config.maxBeat) return;

        setPatternSounds(prevSounds => {
            const lastBeatLength = prevSounds[beats - 1].length;
            const newBeat = [0, ...new Array(lastBeatLength - 1).fill(1)];
            return [...prevSounds, newBeat];
        });
    }, [beats]);

    const removeBeat = useCallback(() => {
        if (beats === 1) return;

        setPatternSounds(prevSounds => prevSounds.slice(0, -1));
    }, [beats]);

    const addTick = useCallback((beatIndex: number) => {
        setPatternSounds(prevSounds => {
            if (prevSounds[beatIndex].length === config.maxTickInTime) return prevSounds;

            const newPattern = [...prevSounds];
            newPattern[beatIndex] = [...newPattern[beatIndex], 1];
            return newPattern;
        });
    }, []);

    const removeTick = useCallback((beatIndex: number) => {
        setPatternSounds(prevSounds => {
            if (prevSounds[beatIndex].length === 1) return prevSounds;

            const newPattern = [...prevSounds];
            newPattern[beatIndex] = newPattern[beatIndex].slice(0, -1);
            return newPattern;
        });
    }, []);

    const togglePlay = useCallback(() => {
        setPlaying(prev => !prev);
    }, []);

    const vibrate = useCallback(() => {
        if ('vibrate' in navigator) {
            navigator.vibrate(200);
        }
    }, []);

    if (isAudioSupported === null) {
        return <div>Checking audio support...</div>;
    }

    if (!isAudioSupported) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black text-zinc-50">
                <div className="text-center p-4">
                    <h1 className="text-2xl mb-4">Audio Not Supported</h1>
                    <p>Your browser does not support the Web Audio API.</p>
                    <p>Please use a modern browser for full functionality.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center min-h-screen ${flash ? 'flash-effect' : ''} bg-black`}>
            <div className={`flex flex-col py-4 items-center ${maxBeats > 4 ? "md:space-y-2" : "md:space-y-6"} text-md text-zinc-50`}>
                <div className="px-6 sm:px-12 py-2 sm:py-4 rounded-2xl transition-[background-color] ease-out duration-500 md:hover:bg-zinc-900">
                    <BeatManager
                        patternSounds={patternSounds}
                        switchSound={switchSound}
                        handleAddTick={addTick}
                        handleRemoveTick={removeTick}
                        handleAddBeat={addBeat}
                        handleRemoveBeat={removeBeat}
                    />
                </div>
                <BPMAdjuster
                    bpm={bpm}
                    handleBpmChange={changeTempo}
                    handleTap={handleTap}
                />
                <ControlPanel className="mt-6 sm:mt-8" isPlaying={isPlaying} togglePlay={togglePlay}/>
            </div>
        </div>
    );
};

export default React.memo(App);