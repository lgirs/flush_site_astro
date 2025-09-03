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
    url: 'https://tavastiaklubi.fi/semifinal/#days',
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

function parseSemifinalDate(dayAndMonthString, currentYear) {
    if (!currentYear) return `${new Date().getFullYear()}-01-01`;

    const parts = dayAndMonthString.replace('.', '').trim().split('.');
    if (parts.length < 2) return `${new Date().getFullYear()}-01-01`;
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    
    return `${currentYear}-${month}-${day}`;
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
    await page.waitForSelector('.table-event-table', { timeout: 15000 });

    const gigs = [];
    let currentYear = null;

    // Get all rows from the event table
    const rows = await page.locator('.table-event-table tbody tr').all();

    for (const row of rows) {
        // Check if the row is a month header
        const headerEl = await row.locator('td[colspan="5"]');
        if (await headerEl.count() > 0) {
            const headerText = await headerEl.textContent();
            const yearMatch = headerText.match(/(\d{4})/);
            if (yearMatch) {
                currentYear = yearMatch[0];
            }
        } else {
            // If it's not a header, it must be a gig
            const dayEl = await row.locator('.day-name');
            const titleEl = await row.locator('.title');
            const linkEl = await row.locator('a.item');

            if (await dayEl.count() > 0 && await titleEl.count() > 0) {
                const dayAndMonthText = await dayEl.textContent();
                const title = await titleEl.textContent();
                const link = await linkEl.getAttribute('href');

                gigs.push({
                    venue: venue.name,
                    date: parseSemifinalDate(dayAndMonthText, currentYear),
                    event: title.trim(),
                    link: new URL(link, venue.url).href,
                });
            }
        }
    }
    return gigs;
}

main();
