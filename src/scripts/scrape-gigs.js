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
    url: 'https://tavastiaklubi.fi/en/semifinal-2/?show_all=1', // <-- NEW, CLEANER URL
    scraper: scrapeSemifinal
  },
];

const outputFile = './src/data/gigs-scraped.json';

// --- Helper Functions ---
function parseLepisDate(dateString) {
  const match = dateString.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return `${new Date().getFullYear()}-01-01`;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function parseSemifinalDate(dateString) {
    const now = new Date();
    let year = now.getFullYear();
    
    // Create a date object from a string like "5.9."
    const parts = dateString.replace('.', '').trim().split('.');
    if (parts.length < 2) return `${year}-01-01`;
    
    const day = parts[0];
    const month = parts[1] - 1; // JS months are 0-indexed
    
    let potentialDate = new Date(year, month, day);

    // If the date is in the past, assume it's next year's gig
    now.setHours(0, 0, 0, 0);
    if (potentialDate < now) {
        potentialDate.setFullYear(year + 1);
    }
    
    const finalYear = potentialDate.getFullYear();
    const finalMonth = String(potentialDate.getMonth() + 1).padStart(2, '0');
    const finalDay = String(potentialDate.getDate()).padStart(2, '0');

    return `${finalYear}-${finalMonth}-${finalDay}`;
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
    // This site has a clean, flat structure, so we can get all items at once.
    const gigElements = await page.locator('.event-list-event').all();
    const gigs = [];

    for (const el of gigElements) {
        const dayAndMonthText = await el.locator('.event-list-date').textContent();
        const title = await el.locator('.event-list-title').textContent();
        const link = await el.locator('a.event-list-link').getAttribute('href');

        gigs.push({
            venue: venue.name,
            date: parseSemifinalDate(dayAndMonthText.trim()),
            event: title.trim(),
            link: link,
        });
    }
    return gigs;
}

main();
