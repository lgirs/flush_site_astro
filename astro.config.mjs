import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Adding the trailing slash here is vital for the sitemap plugin
  site: 'https://flush.rocks/', 
  integrations: [
    mdx(), 
    sitemap()
  ],
  adapter: netlify(),
  output: 'static',
  markdown: { 
    shikiConfig: { 
      theme: 'css-variables' 
    } 
  }
});
