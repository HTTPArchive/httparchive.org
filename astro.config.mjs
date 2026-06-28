import { defineConfig } from 'astro/config';
import { readFileSync } from 'fs';

// Load the last_updated.json for versioned filenames (matching Flask's get_versioned_filename)
let timestamps = {};
try {
  timestamps = JSON.parse(readFileSync('./config/last_updated.json', 'utf8'));
} catch (e) {
  // During initial setup timestamps may not exist yet
}

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
  vite: {
    // Expose timestamps to Astro components
    define: {
      '__TIMESTAMPS__': JSON.stringify(timestamps),
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8080',
        '/metric.json': 'http://127.0.0.1:8080',
      },
    },
  },
});
