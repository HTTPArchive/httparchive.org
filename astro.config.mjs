import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import starlightLlmsTxt from 'starlight-llms-txt';

const sourceMaps = process.env.SOURCE_MAPS === 'true';

export default defineConfig({
  output: 'static',
  outDir: 'dist',

  // Base URL
  site: 'https://httparchive.org',
  devToolbar: {
    enabled: false,
  },
  server: {
    port: 8080,
    host: true,
  },
  build: {
    // Don't add trailing slashes to output filenames
    format: 'directory',
  },
  integrations: [
    starlight({
      title: 'HTTP Archive Docs',
      disable404Route: true,
      customCss: ['./src/styles/starlight-custom.css'],
      components: {
        Header: './src/components/docs/Header.astro',
        Sidebar: './src/components/docs/Sidebar.astro',
        ThemeProvider: './src/components/docs/ThemeProvider.astro',
        ThemeSelect: './src/components/docs/EmptyComponent.astro',
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
      plugins: [
        starlightLlmsTxt(),
        starlightLinksValidator({
          exclude: ['/', '/about/**', '/faq/**', '/reports/**'], // Pages outside starlight
        }),
      ],
    }),
  ],
  vite: {
    build: {
      sourcemap: sourceMaps,
    },
  },
});
