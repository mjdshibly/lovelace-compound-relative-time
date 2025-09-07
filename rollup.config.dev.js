import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import babel from 'rollup-plugin-babel';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import ignore from './rollup-plugins/ignore';
import { ignoreTextfieldFiles } from './elements/ignore/textfield';
import { ignoreSelectFiles } from './elements/ignore/select';
import { ignoreSwitchFiles } from './elements/ignore/switch';
import { exec } from 'child_process';

function scpAfterBuild() {
  return {
    name: 'scp-after-build',
    writeBundle() {
      const localFile = './dist/*';
      const remotePath = '/root/homeassistant/www/';
      const scpCmd = `scp ${localFile} ha:${remotePath}`;
      exec(scpCmd, (err, stdout, stderr) => {
        if (err) {
          console.error('SCP failed:', stderr);
        } else {
          console.log('File successfully copied via SCP!');
        }
      });
    }
  };
}

export default {
  input: ['src/compound-relative-time.ts'],
  output: {
    dir: './dist',
    format: 'es',
    sourcemap: true, // Enable source maps for debugging
  },
  plugins: [
    resolve(),
    typescript(),
    json(),
    babel({
      exclude: 'node_modules/**',
      sourceMaps: true, // Enable Babel source maps
    }),
    // Comment out terser for easier debugging (no minification)
    // terser(),
    serve({
      contentBase: './dist',
      host: '0.0.0.0',
      port: 5000,
      allowCrossOrigin: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    }),
    ignore({
      files: [...ignoreTextfieldFiles, ...ignoreSelectFiles, ...ignoreSwitchFiles].map((file) => require.resolve(file)),
    }),
    scpAfterBuild(),
  ],
};
