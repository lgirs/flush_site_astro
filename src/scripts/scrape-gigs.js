// src/scripts/scrape-gigs.js
import { chromium } from 'playwright';
import fs from 'fs';

// --- Configuration ---
const venues = [
  // {
  //   name: 'Bar Loose',
  //   url: 'https://barloose.com/en/live/',
  //   scraper: scrapeBarLoose
  // },
  {
    name: 'Lepakkomies',
    url: 'https://www.lepis.fi/tapahtumat/',
    scraper: scrapeLepakkomies
  },
];

const outputFile = './src/data/gigs-scraped.json';

// --- Helper Function to Parse DD.MM.YYYY Dates ---
function parseLepisDate(dateString) {
  // Matches a date like "KE 3.9.2025"
  const match = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) {
    return `${new Date().getFullYear()}-01-01`; // Fallback
  }

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
  console.log(`Scraping complete. Data saved to ${outputFile}`);
}

// --- Venue-Specific Scrapers ---

async function scrapeBarLoose(page, venue) {
  // Placeholder - currently disabled
  return [];
}

async function scrapeLepakkomies(page, venue) {
  const gigElements = await page.locator('.tapahtuma').all();
  const gigs = [];

  for (const el of gigElements) {
    const dateText = await el.locator('.entry-details').textContent();
    // Using the new, more accurate selectors you found
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

main();
