import { defineConfig } from 'astro/config';
import { readFileSync } from 'fs';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';

// Load the last_updated.json for versioned filenames (matching Flask's get_versioned_filename)
let timestamps = {};
try {
  timestamps = JSON.parse(readFileSync('./config/last_updated.json', 'utf8'));
} catch (e) {
  // During initial setup timestamps may not exist yet
}

function getVersionedFilename(filePath) {
  const entry = timestamps[filePath];
  if (entry?.hash) return `${filePath}?v=${entry.hash}`;
  return filePath;
}

const bootstrapCss = getVersionedFilename('/static/css/bootstrap.min.css');
const stylesCss    = getVersionedFilename('/static/css/styles.css');
const mainJs       = getVersionedFilename('/static/js/main.js');

export default defineConfig({
  output: 'static',
  outDir: 'dist',
  // Static assets pass-through from /static directory
  publicDir: 'static',
  // Base URL
  site: 'https://httparchive.org',
  build: {
    // Don't add trailing slashes to output filenames
    format: 'directory',
  },
  integrations: [
    starlight({
      title: 'HTTP Archive Docs',
      components: {
        Header: './src/components/docs/Header.astro',
      },
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting started', link: 'docs/guides/getting-started' },
            { label: 'Minimizing query costs', link: 'docs/guides/minimizing-costs' },
            { label: 'Guided tour', link: 'docs/guides/guided-tour' },
            { label: 'Release cycle', link: 'docs/guides/release-cycle' },
          ],
        },
        {
          label: 'Tables',
          items: [{ autogenerate: { directory: 'docs/reference/tables' } }]
        },
        {
          label: 'Structs',
          items: [{ autogenerate: { directory: 'docs/reference/structs' } }]
        },
        {
          label: 'Blobs',
          items: [{ autogenerate: { directory: 'docs/reference/blobs' } }]
        },
        {
          label: 'Custom Metrics',
          items: [{ autogenerate: { directory: 'docs/reference/custom-metrics' } }]
        },
        {
          label: 'Functions',
          items: [{ autogenerate: { directory: 'docs/reference/functions' } }]
        },
      ],
      plugins: [starlightLlmsTxt()],
    }),
  ],
  vite: {
    // Expose timestamps to Astro components
    define: {
      '__TIMESTAMPS__': JSON.stringify(timestamps),
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8080',
        '/metric.json': 'http://127.0.0.1:8080',
        '/.well-known': 'http://127.0.0.1:8080',
      },
    },
  },
});
