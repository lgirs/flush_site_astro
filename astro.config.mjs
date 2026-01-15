import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://flush.rocks',
  integrations: [
    mdx(), 
    sitemap({
      // We are explicitly telling the sitemap plugin the URL here 
      // to bypass the error it's having in the new Netlify environment
      site: 'https://flush.rocks'
    })
  ],
  adapter: netlify(),
  output: 'static',
  markdown: { 
    shikiConfig: { 
      theme: 'css-variables' 
    } 
  }
});
