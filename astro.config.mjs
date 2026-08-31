// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import { garageDevApi } from './src/lib/garage/dev-plugin.ts';

// https://astro.build/config
export default defineConfig({
  site: 'https://milehighfamily.com',
  vite: {
    plugins: [tailwindcss(), garageDevApi()],
  },
  integrations: [mdx()],
});
