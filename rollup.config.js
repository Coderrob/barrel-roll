/*
 * Copyright 2025 Robert Lindley
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

/**
 * @typedef {Object} RollupWarning
 * @property {string} code
 * @property {string[]} [ids]
 */

const config = {
  input: 'src/index.ts',
  external: (id) => {
    // Keep all pino* as external for smaller bundle
    return id.startsWith('pino');
  },
  /**
   * @param {RollupWarning} warning
   * @param {(warning: RollupWarning) => void} warn
   */
  onwarn: (warning, warn) => {
    // Ignore circular dependency warnings from third-party modules
    if (
      warning.code === 'CIRCULAR_DEPENDENCY' &&
      warning.ids?.some((id) => id.includes('node_modules'))
    ) {
      return;
    }
    warn(warning);
  },
  output: {
    file: 'out/index.mjs',
    format: 'es',
    esModule: true,
    sourcemap: false,
    compact: true,
    minifyInternalExports: true,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
    }),
    nodeResolve({
      preferBuiltins: true,
      exportConditions: ['node'],
      modulesOnly: true,
    }),
    terser({
      format: {
        comments: false,
      },
      compress: {
        drop_console: false, // Keep console for runtime logging
        drop_debugger: true,
        pure_funcs: ['console.debug'],
      },
    }),
  ],
};

export default config;
