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
    url: 'https://barloose.com/live/',
    scraper: scrapeBarLoose
  },
  // { 
  //   name: 'Lepakkomies', 
  //   url: 'https://www.lepis.fi/tapahtumat/',
  //   scraper: scrapeLepakkomies
  // },
];

const outputFile = './src/data/gigs-scraped.json';

// --- Helper Function to Parse Finnish Dates ---
function parseFinnishDate(dateString) {
  const monthMap = {
    tammi: '01', helmi: '02', maalis: '03', huhti: '04', touko: '05', kesä: '06',
    heinä: '07', elo: '08', syys: '09', loka: '10', marras: '11', joulu: '12'
  };
  const currentYear = new Date().getFullYear();
  
  const [monthName, day] = dateString.toLowerCase().split(' ');
  const month = monthMap[monthName];

  if (!month || !day) return `${currentYear}-01-01`; // Fallback date

  // Assume the gig is this year. If the date is in the past, assume it's next year.
  const gigDate = new Date(`${currentYear}-${month}-${day}`);
  if (gigDate < new Date()) {
    return `${currentYear + 1}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

    gigs.push({
      venue: venue.name,
      date: parseFinnishDate(dateText.trim()),
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
