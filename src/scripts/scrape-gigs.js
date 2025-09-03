// src/scripts/scrape-gigs.js
import { chromium } from 'playwright';
import fs from 'fs';

// --- Configuration ---
const venues = [
  {
    name: 'Lepakkomies',
    url: 'https://www.lepis.fi/tapahtumat/',
    scraper: scrapeLepakkomies
  },
  {
    name: 'Semifinal',
    url: 'https://tavastiaklubi.fi/en/semifinal-2/?show_all=1',
    scraper: scrapeSemifinal
  },
];

const outputFile = './src/data/gigs-scraped.json';

// --- Helper Function ---
function parseLepisDate(dateString) {
  const match = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return `${new Date().getFullYear()}-01-01`;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  return `${year}-${month}-${day}`;
}

// --- Main Scraper Logic ---
async function main() {
  console.log('Starting gig scraper...');
  const browser = await chromium.launch();
  const allGigs = [];

  for (const venue of venues) {
    try {
      console.log(`Scraping ${venue.name}...`);
      const page = await browser.newPage();
      await page.goto(venue.url, { waitUntil: 'networkidle' });
      const gigs = await venue.scraper(page, venue);
      allGigs.push(...gigs);
      console.log(`Found ${gigs.length} gigs at ${venue.name}.`);
    } catch (error) {
      console.error(`Failed to scrape ${venue.name}:`, error);
    }
  }

  await browser.close();

  // Sort all gigs by date
  allGigs.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Write to file
  fs.writeFileSync(outputFile, JSON.stringify(allGigs, null, 2));
  console.log(`Scraping complete. Data saved to ./src/data/gigs-scraped.json`);
}

// --- Venue-Specific Scrapers ---

async function scrapeLepakkomies(page, venue) {
  const gigElements = await page.locator('article.tapahtuma:has(a[href*="tapahtumat"])').all();
  const gigs = [];
  for (const el of gigElements) {
    const dateText = await el.locator('.entry-details').textContent();
    const title = await el.locator('.entry-content h1').textContent();
    const link = await el.locator('.entry-content h1 a').getAttribute('href');
    gigs.push({
      venue: venue.name,
      date: parseLepisDate(dateText.trim()),
      event: title.trim(),
      link: link,
    });
  }
  return gigs;
}

async function scrapeSemifinal(page, venue) {
    // Wait for the main event container to be loaded and visible
    await page.waitForSelector('.tiketti-list-item', { timeout: 15000 });
    
    const gigElements = await page.locator('.tiketti-list-item').all();
    const gigs = [];

    for (const el of gigElements) {
        // Get data directly from attributes, which is very reliable
        const date = await el.getAttribute('data-begin-date');
        const title = await el.locator('h3').textContent();
        const link = await el.getAttribute('href');

        gigs.push({
            venue: venue.name,
            date: date, // Use the direct date from the attribute
            event: title.trim(),
            link: link,
        });
    }
    return gigs;
}

main();
