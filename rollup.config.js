// @ts-check

import typescript from 'rollup-plugin-typescript2'

export default {
  input: './src/index.ts',
  output: {
    file: './dist/index.js',
    format: 'iife',
    name: 'vDom'
  },
  plugins: [
    typescript(),
  ],
}
