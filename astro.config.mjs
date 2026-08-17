import { defineConfig } from 'astro/config';

const sourceMaps = process.env.SOURCE_MAPS === 'true';

export default defineConfig({
  output: 'static',
  outDir: 'dist',

  // Base URL
  site: 'https://httparchive.org',
  build: {
    // Don't add trailing slashes to output filenames
    format: 'directory',
  },
  vite: {
    build: {
      sourcemap: sourceMaps,
    },
  },
});
