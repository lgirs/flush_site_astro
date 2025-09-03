// src/scripts/scrape-gigs.js
import { chromium } from 'playwright';
import fs from 'fs';

// --- Configuration ---
const venues = [
  // { 
  //   name: 'Semifinal', 
  //   url: 'https://tavastiaklubi.fi/semifinal/#days',
  //   scraper: scrapeSemifinal 
  // },
  { 
    name: 'Bar Loose', 
    url: 'https://barloose.com/en/live/', // <-- CHANGED TO ENGLISH URL
    scraper: scrapeBarLoose
  },
  // { 
  //   name: 'Lepakkomies', 
  //   url: 'https://www.lepis.fi/tapahtumat/',
  //   scraper: scrapeLepakkomies
  // },
];

const outputFile = './src/data/gigs-scraped.json';

// --- Helper Function to Parse English Dates ---
function parseEnglishDate(dateString) {
  const now = new Date();
  let year = now.getFullYear();

  // Try to parse a date like "September 3"
  const potentialDate = new Date(`${dateString} ${year}`);
  
  if (isNaN(potentialDate.getTime())) {
    return `${year}-01-01`; // Fallback
  }

  // Check if the parsed date is in the past compared to today's date
  now.setHours(0, 0, 0, 0); 
  if (potentialDate < now) {
    potentialDate.setFullYear(year + 1);
  }
  
  const month = String(potentialDate.getMonth() + 1).padStart(2, '0');
  const day = String(potentialDate.getDate()).padStart(2, '0');
  
  return `${potentialDate.getFullYear()}-${month}-${day}`;
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

async function scrapeSemifinal(page, venue) {
  // Placeholder - to be implemented
  return [];
}

async function scrapeBarLoose(page, venue) {
  const gigElements = await page.locator('.tribe-events-pro-photo__event').all();
  const gigs = [];

  for (const el of gigElements) {
    const dateText = await el.locator('.tribe-events-pro-photo__event-datetime').textContent();
    const title = await el.locator('.tribe-events-pro-photo__event-title').textContent();
    const link = await el.locator('.tribe-events-pro-photo__event-title-link').getAttribute('href');

    // DEBUGGING LINE
    console.log('Raw date text:', dateText.trim());

    gigs.push({
      venue: venue.name,
      date: parseEnglishDate(dateText.trim()),
      event: title.trim(),
      link: link,
    });
  }
  return gigs;
}

async function scrapeLepakkomies(page, venue) {
  // Placeholder - to be implemented
  return [];
}

main();
