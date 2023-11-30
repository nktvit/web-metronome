import { useState, useEffect } from 'react';

const useBufferLoader = (audioContext: AudioContext, urls: string[]) => {
  const [buffers, setBuffers] = useState<AudioBuffer[]>([]);

  useEffect(() => {
    const loadBuffer = async (url: string): Promise<AudioBuffer> => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return audioContext.decodeAudioData(arrayBuffer);
    };

    const loadBuffers = async () => {
      const promises = urls.map(url => loadBuffer(url));
      const loadedBuffers = await Promise.all(promises);
      setBuffers(loadedBuffers);
    };

    loadBuffers();

    // Since dependencies are empty, this effect will run only once, on mount.
  }, []);

  return buffers;
};

export default useBufferLoader;
