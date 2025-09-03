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
  {
    name: 'Bar Loose',
    url: 'https://barloose.com/en/live/',
    scraper: scrapeBarLoose
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

function parseEnglishDate(dateString) {
  const now = new Date();
  let year = now.getFullYear();
  const potentialDate = new Date(`${dateString} ${year}`);
  if (isNaN(potentialDate.getTime())) return `${year}-01-01`;
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
  allGigs.sort((a, b) => new Date(a.date) - new Date(b.date));
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
    gigs.push({ venue: venue.name, date: parseLepisDate(dateText.trim()), event: title.trim(), link: link });
  }
  return gigs;
}

async function scrapeSemifinal(page, venue) {
  await page.waitForSelector('.tiketti-list-item', { timeout: 15000 });
  const gigElements = await page.locator('.tiketti-list-item').all();
  const gigs = [];
  for (const el of gigElements) {
    const date = await el.getAttribute('data-begin-date');
    const title = await el.locator('h3').textContent();
    const link = await el.getAttribute('href');
    gigs.push({ venue: venue.name, date: date, event: title.trim(), link: link });
  }
  return gigs;
}

async function scrapeBarLoose(page, venue) {
  const gigs = [];
  const nextButtonSelector = 'a.tribe-events-c-nav__next';
  while (true) {
    await page.waitForSelector('.tribe-events-pro-photo__event', { timeout: 15000 });
    const gigElements = await page.locator('.tribe-events-pro-photo__event').all();
    for (const el of gigElements) {
      const dateEl = await el.locator('.tribe-events-pro-photo__event-date-tag').all();
      // Only process elements that have the clean date tag
      if (dateEl.length > 0) {
        const dateText = await dateEl[0].textContent();
        const title = await el.locator('.tribe-events-pro-photo__event-title').textContent();
        const link = await el.locator('.tribe-events-pro-photo__event-title-link').getAttribute('href');
        gigs.push({
          venue: venue.name,
          date: parseEnglishDate(dateText.trim()),
          event: title.trim(),
          link: link,
        });
      }
    }
    const nextButton = page.locator(nextButtonSelector);
    if (await nextButton.count() > 0 && await nextButton.isVisible()) {
      console.log('Clicking "Next Events" button for Bar Loose...');
      await nextButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      break; // Exit loop if no next button is found
    }
  }
  return gigs;
}

main();
