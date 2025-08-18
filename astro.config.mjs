import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify/functions';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  adapter: netlify(),
  markdown: { shikiConfig: { theme: 'css-variables' } }
});
