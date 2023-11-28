import { useEffect, useState } from "react";

type AudioBufferList = (AudioBuffer | null)[];

function useBufferLoader(context: AudioContext | null, urlList: string[]): AudioBufferList {
  const [bufferList, setBufferList] = useState<AudioBufferList>(new Array(urlList.length).fill(null));
  const [loadCount, setLoadCount] = useState<number>(0);

  useEffect(() => {
    console.log("useEffect - useBufferLoader");

    const loadBuffer = (url: string, index: number) => {
      const request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";

      request.onload = function () {
        if (context) {
          context.decodeAudioData(
            request.response,
            function (buffer) {
              if (!buffer) {
                alert('Error decoding file data: ' + url);
                return;
              }
              setBufferList((prevBufferList) => {
                const newBufferList = [...prevBufferList];
                newBufferList[index] = buffer;
                return newBufferList;
              });
              setLoadCount((prevLoadCount) => prevLoadCount + 1);
            }
          );
        }
        else {
          alert("No context provided")
        }

      };

      request.onerror = function () {
        alert('BufferLoader: XHR error');
      };

      request.send();
    };

    if (loadCount < urlList.length) {
      loadBuffer(urlList[loadCount], loadCount);
    }
  }, [context, loadCount, urlList]);

  return bufferList;
}

export default useBufferLoader;