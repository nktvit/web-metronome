import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				dead_code: true,
				drop_debugger: true,
				conditionals: true,
				evaluate: true,
				booleans: true,
				loops: true,
				unused: true,
				hoist_funs: true,
				keep_fargs: false,
				hoist_vars: true,
				if_return: true,
				join_vars: true,
				side_effects: true,
			},
		},
	},
});
