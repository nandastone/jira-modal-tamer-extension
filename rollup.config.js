import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'
import del from 'rollup-plugin-delete'
import svg from 'rollup-plugin-svg'

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/index.min.js',
    format: 'iife',
    name: 'main',
    plugins: [
      terser()
    ]
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    svg({ base64: true }),
    del({ targets: 'dist/*' }),
    copy({
      targets: [
        { src: 'src/manifest.json', dest: 'dist' },
        { src: 'src/assets/icon-*.png', dest: 'dist' }
      ]
    })
  ]
}
