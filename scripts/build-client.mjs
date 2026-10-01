/**
 * Build the browser half of dsh-media-studio into the DSH client-bundle
 * artifact shape (see deepseek-harness packages/client/tsdown.client.ts and
 * packages/client/modules/src/client/manifest.ts):
 *
 *   window.__ModuleLoader__.load({ id, factory: (require) => moduleExports })
 *
 * The factory form is "lazy CJS": the bundle only registers a closure
 * factory; externals (react, react/jsx-runtime, @deepseek-ai/*) resolve
 * through the injected `require` (loader module table). CSS is intentionally
 * not used — components ship inline styles so no stylesheet pipeline is
 * needed for an out-of-tree package.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

const id = 'dsh-media-studio'

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  external: [
    'react',
    'react/*',
    'react-dom',
    'react-dom/*',
    '@deepseek-ai/*',
  ],
  banner: {
    js: `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:(require)=>{const module={exports:{}};`,
  },
  footer: {
    // The toStringTag definition matches the shipped tsdown client-bundle
    // shape (`Object.defineProperty(exports, Symbol.toStringTag, ...)`); it
    // must run AFTER esbuild's `module.exports = ...` assignment, hence footer.
    js: ';Object.defineProperty(module.exports,Symbol.toStringTag,{value:"Module"});return module.exports}});',
  },
})

console.log(`[build-client] lib/client.js written (bundle id ${id})`)
