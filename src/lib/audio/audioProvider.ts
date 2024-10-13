import AudioWorker from "../../service-worker/audio.worker?worker";
import type { IAudioProvider } from '../../interfaces/IAudioProvider';

interface ControlMessage {
	action: "play" | "stop" | "updateTempo";
	tempo?: number;
}

export class AudioProvider implements IAudioProvider {
	private readonly audioWorker: Worker;

	constructor() {
		this.audioWorker = new AudioWorker();
	}

	public play(tempo: number) {
		const message: ControlMessage = { action: "play", tempo };
		this.audioWorker.postMessage(message);
	}

	public stop() {
		const message: ControlMessage = { action: "stop" };
		this.audioWorker.postMessage(message);
	}

	public updateTempo(newTempo: number) {
		const message: ControlMessage = { action: "updateTempo", tempo: newTempo };
		this.audioWorker.postMessage(message);
	}

	public setMessageHandler(handler: (event: MessageEvent) => void) {
		this.audioWorker.onmessage = handler;
	}

	public cleanup() {
		this.audioWorker.terminate();
		console.log('Audio worker terminated');
	}
}
