// src/scripts/generate-previews.js
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';

const linksFile = './src/data/intertainment-links.json';
const outputFile = './src/data/intertainment-data.json';

async function fetchMetadata(url) {
  try {
    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': 'FlushBot/1.0' }
    });
    const $ = cheerio.load(html);

    const getMeta = (prop) => $(`meta[property="${prop}"]`).attr('content') || $(`meta[name="${prop}"]`).attr('content');

    const title = getMeta('og:title') || $('title').text() || 'No title found';
    const description = getMeta('og:description') || getMeta('description') || 'No description found.';
    let image = getMeta('og:image') || getMeta('twitter:image');

    if (image) {
      image = new URL(image, url).href;
    }

    return { title, description, image };
  } catch (error) {
    console.error(`Could not fetch metadata for ${url}:`, error.message);
    return { title: url, description: 'Could not fetch preview.', image: null };
  }
}

async function main() {
  console.log('Generating link previews...');
  if (!fs.existsSync(linksFile)) {
    console.log(`Source file not found at ${linksFile}. Skipping preview generation.`);
    fs.writeFileSync(outputFile, JSON.stringify([], null, 2));
    return;
  }

  const links = JSON.parse(fs.readFileSync(linksFile, 'utf-8'));
  const fullData = [];

  for (const link of links) {
    const metadata = await fetchMetadata(link.url);
    
    // If an overrideImage is provided, use it. Otherwise, use the scraped one.
    if (link.overrideImage) {
        metadata.image = link.overrideImage;
    }
    
    fullData.push({
      ...link,
      preview: metadata
    });
  }

  fs.writeFileSync(outputFile, JSON.stringify(fullData, null, 2));
  console.log(`Link previews saved to ${outputFile}`);
}

main();
