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
    tammikuun: '01', helmikuun: '02', maaliskuun: '03', huhtikuun: '04', toukokuun: '05', kesäkuun: '06',
    heinäkuun: '07', elokuun: '08', syyskuun: '09', lokakuun: '10', marraskuun: '11', joulukuun: '12'
  };
  const now = new Date();
  const currentYear = now.getFullYear();

  const cleanedString = dateString.trim().toLowerCase();
  
  // Find the first month and day in the string
  const parts = cleanedString.split(' ');
  let month = null;
  let day = null;

  for (let i = 0; i < parts.length; i++) {
    if (monthMap[parts[i]]) {
      month = monthMap[parts[i]];
      day = parts[i - 1]; // Assume the day is right before the month
      break;
    }
  }

  if (!month || !day || isNaN(parseInt(day))) {
    return `${currentYear}-01-01`; // Fallback
  }

  const dayPadded = day.padStart(2, '0');
  let year = currentYear;
  
  // Check if the parsed date is in the past. If so, assume it's for the next year.
  const potentialDate = new Date(`${year}-${month}-${dayPadded}`);
  now.setHours(0, 0, 0, 0);
  if (potentialDate < now) {
    year = currentYear + 1;
  }
  
  return `${year}-${month}-${dayPadded}`;
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
