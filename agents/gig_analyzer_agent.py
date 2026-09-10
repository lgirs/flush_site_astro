import os
import json
import logging
from datetime import datetime

# Set up logging to show up in GitHub Actions terminal
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def run_analyzer():
    raw_path = "data/gigs_raw.json"
    output_path = "src/data/venue-gigs.json"

    if not os.path.exists(raw_path):
        logging.error(f"Raw gigs file not found at {raw_path}. Run the Identifier agent first.")
        return

    with open(raw_path, "r", encoding="utf-8") as f:
        try:
            raw_gigs = json.load(f)
        except json.JSONDecodeError:
            logging.error(f"Could not parse {raw_path} as valid JSON.")
            return

    if not raw_gigs:
        logging.warning("Raw gigs file is empty. Saving empty array to destination.")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as out:
            json.dump([], out, indent=2, ensure_ascii=False)
        return

    # --- PURE PYTHON FILTERING LOGIC ---
    today = datetime.now().date()
    validated_gigs = []
    
    logging.info(f"Starting Python-based analysis of {len(raw_gigs)} raw gigs...")

    for gig in raw_gigs:
        title = gig.get("title", "Unknown Title")
        date_str = gig.get("date")
        venue = gig.get("venue", "Unknown Venue")

        # Check 1: Missing Title
        if not title or title == "Unknown Title":
            logging.info(f"Dropped gig at {venue}: Missing title.")
            continue
        
        # Check 2: Missing Date
        if not date_str:
            logging.info(f"Dropped '{title}' at {venue}: Missing date.")
            continue

        # Check 3: Date formatting and Past Dates
        try:
            # We expect the Identifier to pass YYYY-MM-DD format
            gig_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            if gig_date < today:
                logging.info(f"Dropped '{title}' at {venue}: Date {date_str} is in the past.")
                continue
                
        except ValueError:
            logging.info(f"Dropped '{title}' at {venue}: Invalid date format '{date_str}'. Expected YYYY-MM-DD.")
            continue
            
        # If it survives the checks, it's a valid gig!
        validated_gigs.append(gig)

    # Sort them chronologically just to be tidy
    validated_gigs.sort(key=lambda x: x.get("date"))

    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(validated_gigs, f, indent=2, ensure_ascii=False)

    logging.info(f"Successfully analyzed and saved {len(validated_gigs)} approved gigs to {output_path}")

if __name__ == "__main__":
    run_analyzer()
