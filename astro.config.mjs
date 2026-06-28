import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';

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
      editLink: {
        baseUrl: 'https://github.com/HTTPArchive/httparchive.org/edit/main/'
      },
      plugins: [starlightLlmsTxt(), starlightLinksValidator()],
    }),
  ],
  vite: {
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8080',
        '/metric.json': 'http://127.0.0.1:8080',
        '/.well-known': 'http://127.0.0.1:8080',
      },
    },
  },
});
