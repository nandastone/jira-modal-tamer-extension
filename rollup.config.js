import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/inject.js',
    format: 'cjs'
  },
  plugins: [nodeResolve(), commonjs()]
}
