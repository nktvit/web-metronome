import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { AudioProvider } from '$lib/audio/audioProvider';

interface MetronomeState {
	isPlaying: boolean;
	tempo: number;
}

function createMetronomeStore() {
	let audioProvider: AudioProvider | null = null;

	const { subscribe, update, set } = writable<MetronomeState>({
		isPlaying: false,
		tempo: 60
	});

	function getAudioProvider() {
		if (browser && !audioProvider) {
			audioProvider = new AudioProvider();
			audioProvider.setMessageHandler((event: MessageEvent) => {
				const { type, data } = event.data;
				switch (type) {
					case "playbackStatus":
						update(state => ({ ...state, isPlaying: data.isPlaying }));
						break;
					case "error":
						console.error("Audio Worker Error:", data.message);
						break;
				}
			});
		}
		return audioProvider;
	}

	return {
		subscribe,
		play: () => {
			const provider = getAudioProvider();
			if (provider) {
				update(state => {
					provider.play(state.tempo);
					return { ...state, isPlaying: true };
				});
			}
		},
		stop: () => {
			const provider = getAudioProvider();
			if (provider) {
				provider.stop();
				update(state => ({ ...state, isPlaying: false }));
			}
		},
		updateTempo: (newTempo: number) => {
			const provider = getAudioProvider();
			if (provider) {
				provider.updateTempo(newTempo);
				update(state => ({ ...state, tempo: newTempo }));
			}
		},
		cleanup: () => {
			if (audioProvider) {
				audioProvider.cleanup();
				audioProvider = null;
			}
		}
	};
}

export const metronomeStore = createMetronomeStore();
