<script lang="ts">
	import { onDestroy } from 'svelte';
	import { metronomeStore } from '../stores/metronome';

	let isPlaying: boolean;
	let tempo: number;

	const unsubscribe = metronomeStore.subscribe(state => {
		isPlaying = state.isPlaying;
		tempo = state.tempo;
	});

	onDestroy(() => {
		unsubscribe();
		metronomeStore.cleanup();
	});

	function toggleMetronome() {
		if (isPlaying) {
			metronomeStore.stop();
		} else {
			metronomeStore.play();
		}
	}

	function updateTempo(newTempo: number) {
		metronomeStore.updateTempo(newTempo);
	}
</script>

<button on:click={toggleMetronome}>
	{isPlaying ? 'Stop' : 'Play'}
</button>

<input
	type="number"
	bind:value={tempo}
	on:input={() => updateTempo(tempo)}
/>

<p>Current tempo: {tempo} BPM</p>
