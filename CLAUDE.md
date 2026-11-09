# CLAUDE.md

Website for the band **Flush** — live at https://flush.rocks

## How to work with me (the owner)

- I am **not a programmer**. I built this site with AI assistants and edit files on GitHub online.
- Keep explanations **simple and short**. No jargon without a one-line explanation.
- Do **one thing at a time**. Finish a step, then wait for me.
- **Always ask before making any change** (editing, creating, deleting files, committing, pushing).
- **Never put API keys, passwords or other secrets in the code.** Secrets belong in GitHub Secrets or Netlify environment variables only.
- When I need to do something myself, give me clear step-by-step instructions (e.g. where to click on GitHub).

## How the site gets published

- Code lives on **GitHub** (branch `main`). **Netlify** is connected to it.
- Every change pushed to `main` → Netlify builds and publishes the site automatically.
- Netlify settings: `netlify.toml` (runs `npm run build`, publishes the `dist` folder, Node 20).
- A daily GitHub Action (`.github/workflows/daily-build.yml`) triggers a Netlify rebuild at 05:00 UTC.

## What the site is built with

- **Astro** (v4) — a static website builder. Config: `astro.config.mjs`.
- Pages are `.astro` files; text pages can be `.mdx` (Markdown).
- Commands (only if running locally): `npm install`, `npm run dev` (preview), `npm run build`.

## Where things are

| What | Where |
|---|---|
| Pages (each file = one URL) | `src/pages/` (e.g. `gigs/index.astro` → `/gigs`) |
| Main menu, header, footer | `src/layouts/BaseLayout.astro` |
| Home page layout | `src/layouts/HomeLayout.astro`, `src/pages/index.astro` |
| Reusable pieces (logo, tiles, tags…) | `src/components/` |
| Text pages like Lyrics | `src/content/pages/*.mdx` (shown at `/content/<name>/`) |
| Site-wide styles/colours/fonts | `src/styles/global.css` |
| Images, logos | `public/images/` and `src/assets/` |
| Redirects | `public/_redirects` |

## Data files (easy to edit, no code needed)

- `src/data/gigs.json` — the band's own gigs (date, event, venue, city, country, link, notes).
- `src/data/intertainment-links.json` — links on the Extras → Intertainment page (url, headline, annotation, optional image).
- `src/data/venue_gigs.json` — **generated automatically** by the venue tracker. Don't edit by hand.

JSON is fussy: keep commas and quotes exactly in the same pattern as the existing entries.

## Venue Tracker (Python + AI)

- Finds upcoming gigs at Helsinki venues and shows them on `/venue-tracker`.
- Runs via GitHub Action `.github/workflows/run_venue_tracker.yml` (Mon & Fri, 04:00 UTC).
- `main_workflow.py` runs two steps in `agents/`: identifier (scrapes venues + Google Gemini AI) → analyzer (cleans/filters).
- Venue list: `config/gig_venues.json`. AI instructions: `config/identifier_prompt.txt`.
- Uses the `GEMINI_API_KEY` stored in **GitHub Secrets** — never in the code.
- The bot commits updated `src/data/venue_gigs.json` itself.
- Status: the venue-tracker page currently shows a "temporarily out of order" message.

## Notes

- `src/scripts/generate-previews.js` and `scrape-gigs.js` are helper scripts not used by the build.
- Files ending in `_notinuse` are kept for reference only.
