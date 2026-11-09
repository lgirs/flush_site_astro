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
- There is **no separate daily rebuild**. The Venue Tracker (below) triggers a Netlify rebuild on Mon/Wed/Sat. That rebuild also moves past shows on the Gigs page from "upcoming" to "past".
- Claude cannot push from this computer (no GitHub login). Claude commits locally; the owner pushes with **GitHub Desktop** ("Push origin"). Before starting new work, pull the latest from GitHub — the tracker bot adds its own commits.

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
- Runs via GitHub Action `.github/workflows/run_venue_tracker.yml` — **Mon, Wed, Sat at 04:00 UTC**, or by hand (Actions → Run Venue Tracker Agents → Run workflow).
- One run, in order: find gigs → save `src/data/venue_gigs.json` (bot commits it with `[skip ci]`) → trigger Netlify rebuild.
- `main_workflow.py` runs two steps in `agents/`:
  - **Identifier** (`gig_identifier_agent.py`): reads each venue page and asks Google Gemini to list the gigs. Model: `gemini-3.5-flash-lite` (free tier: 500 requests/day; one request per venue, plus retries). Retries up to 5 times when the AI is busy (503). If a venue fails, it keeps that venue's gigs from the previous run. Each gig gets a `source_venue` field.
  - **Analyzer** (`gig_analyzer_agent.py`): plain Python, no AI. Drops gigs without title/date and past gigs. The AI often guesses one year too early, so a date more than 30 days in the past is moved forward one year.
- Venue list: `config/gig_venues.json`. AI instructions: `config/identifier_prompt.txt`.
- Secrets in **GitHub Secrets** (never in the code): `GEMINI_API_KEY`, `NETLIFY_BUILD_HOOK`.
- Open issues: Hard Rock House returns 0 gigs (page may load gigs in a way the tracker can't read); non-gigs like "D-reservation"/"Prebooking" are not filtered out yet.
- A run that ends with GitHub's "Internal server error" is GitHub's problem — just re-run it.

## Notes

- `src/scripts/generate-previews.js` and `scrape-gigs.js` are helper scripts not used by the build.
- Files ending in `_notinuse` are kept for reference only.
