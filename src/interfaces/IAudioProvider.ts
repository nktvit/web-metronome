export interface IAudioProvider {
	play(tempo: number): void;
	stop(): void;
	updateTempo(tempo: number): void;
	setMessageHandler(handler: (event: MessageEvent) => void): void;
	cleanup(): void;
}
