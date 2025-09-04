// src/scripts/scrape-gigs.js
import { chromium } from 'playwright';
import fs from 'fs';

// --- Configuration ---
const venues = [
  {
    name: 'Lepakkomies',
    url: 'https://www.lepis.fi/tapahtumat/',
    city: 'Helsinki',
    scraper: scrapeLepakkomies
  },
  {
    name: 'Semifinal',
    url: 'https://tavastiaklubi.fi/en/semifinal-2/?show_all=1',
    city: 'Helsinki',
    scraper: scrapeSemifinal
  },
  {
    name: 'Bar Loose',
    url: 'https://barloose.com/en/live/photo/',
    city: 'Helsinki',
    scraper: scrapeBarLoose
  },
  {
    name: 'Kuudes Linja',
    url: 'https://www.kuudeslinja.com/',
    city: 'Helsinki',
    scraper: scrapeKuudeslinja
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

function parseKuudeslinjaDate(dateString) {
    const now = new Date();
    let year = now.getFullYear();
    const parts = dateString.toLowerCase().split(' ')[1]?.split('.');
    if (!parts || parts.length < 2) return `${year}-01-01`;

    const day = parts[0];
    const month = parts[1] - 1;

    let potentialDate = new Date(year, month, day);

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
      const gigs = await venue.scraper(browser, venue);
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
async function scrapeLepakkomies(browser, venue) {
  const page = await browser.newPage();
  await page.goto(venue.url, { waitUntil: 'networkidle' });
  const gigElements = await page.locator('article.tapahtuma:has(a[href*="tapahtumat"])').all();
  const gigs = [];
  for (const el of gigElements) {
    const dateText = await el.locator('.entry-details').textContent();
    const title = await el.locator('.entry-content h1').textContent();
    const link = await el.locator('.entry-content h1 a').getAttribute('href');
    gigs.push({ venue: venue.name, city: venue.city, date: parseLepisDate(dateText.trim()), event: title.trim(), link: link });
  }
  await page.close();
  return gigs;
}

async function scrapeSemifinal(browser, venue) {
  const page = await browser.newPage();
  await page.goto(venue.url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tiketti-list-item', { timeout: 15000 });
  const gigElements = await page.locator('.tiketti-list-item').all();
  const gigs = [];
  for (const el of gigElements) {
    const date = await el.getAttribute('data-begin-date');
    const title = await el.locator('h3').textContent();
    const link = await el.getAttribute('href');
    gigs.push({ venue: venue.name, city: venue.city, date: date, event: title.trim(), link: link });
  }
  await page.close();
  return gigs;
}

async function scrapeBarLoose(browser, venue) {
  const gigs = [];
  const pagesToScrape = ['', 'page/2/', 'page/3/', 'page/4/'];
  for (const p of pagesToScrape) {
    const url = venue.url + p;
    console.log(`Scraping Bar Loose page: ${url}`);
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.tribe-events-pro-photo__event', { timeout: 15000 });
    const gigElements = await page.locator('.tribe-events-pro-photo__event').all();
    for (const el of gigElements) {
      const title = await el.locator('.tribe-events-pro-photo__event-title').textContent();
      if (title.toUpperCase().includes('LOOSEN SUNNARIT')) {
        continue;
      }
      const dateEl = await el.locator('.tribe-events-pro-photo__event-date-tag').all();
      if (dateEl.length > 0) {
        const dateText = await dateEl[0].textContent();
        const link = await el.locator('.tribe-events-pro-photo__event-title-link').getAttribute('href');
        gigs.push({ venue: venue.name, city: venue.city, date: parseEnglishDate(dateText.trim()), event: title.trim(), link: link });
      }
    }
    await page.close();
  }
  return gigs;
}

async function scrapeKuudeslinja(browser, venue) {
    const page = await browser.newPage();
    await page.goto(venue.url, { waitUntil: 'networkidle' });
    const gigElements = await page.locator('article.event').all();
    const gigs = [];
    for (const el of gigElements) {
        const dateText = await el.locator('.pvm').textContent();
        const title = await el.locator('.title').textContent();
        
        gigs.push({
            venue: venue.name,
            city: venue.city,
            date: parseKuudeslinjaDate(dateText.trim()),
            event: title.trim(),
            link: venue.url, // Use the main venue URL as the link
        });
    }
    await page.close();
    return gigs;
}

main();
