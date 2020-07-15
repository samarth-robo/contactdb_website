import resolve from '@rollup/plugin-node-resolve'; // locate and bundle dependencies in node_modules (mandatory)
import { terser } from "rollup-plugin-terser"; // code minification (optional)

export default {
	input: 'js/contactpose_explorer.js',
	output: [
		{
			format: 'umd',
			name: 'MYAPP',
			file: 'js/bundle.js'
		}
	],
	plugins: [ resolve(), terser() ]
};