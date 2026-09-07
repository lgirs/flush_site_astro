import os
import json
import logging
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables (e.g., GEMINI_API_KEY)
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Initialize Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logging.error("GEMINI_API_KEY is missing. Please add it to your .env file.")
    exit(1)

genai.configure(api_key=api_key)
# gemini-1.5-flash is ideal for high-speed, low-cost data extraction tasks
model = genai.GenerativeModel('gemini-1.5-flash') 

# Headers to mimic a real browser request
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,fi;q=0.8",
}

def clean_html_text(html_content: str) -> str:
    """Strips unnecessary HTML tags to save tokens and clean the text."""
    soup = BeautifulSoup(html_content, "html.parser")

    for element in soup(["script", "style", "nav", "footer", "header", "noscript", "svg"]):
        element.decompose()

    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)

def run_identifier():
    venues_path = "config/gig_venues.json"
    prompt_path = "config/identifier_prompt.txt"
    output_path = "data/gigs_raw.json"
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(venues_path, "r", encoding="utf-8") as f:
        venues = json.load(f)
        
    with open(prompt_path, "r", encoding="utf-8") as f:
        system_prompt = f.read()

    all_raw_gigs = []

    for venue in venues:
        name = venue.get("name", "Unknown")
        city = venue.get("city", "Unknown")
        url = venue.get("url")
        
        logging.info(f"Crawling venue: {name} at {url}")
        
        try:
            # 1. Scrape the HTML
            response = requests.get(url, headers=HEADERS, timeout=15)
            response.raise_for_status()
            
            # 2. Clean and trim the text to fit comfortably in token limits
            cleaned_text = clean_html_text(response.text)[:20000] 
            
            # 3. Construct the prompt
            full_prompt = (
                f"{system_prompt}\n\n"
                f"Context: You are looking at the website for {name} located in {city}.\n\n"
                f"Here is the scraped text:\n{cleaned_text}"
            )
            
            # 4. Request JSON extraction from Gemini
            llm_response = model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1 # Low temperature for factual extraction
                )
            )
            
            # 5. Parse and append results
            try:
                gigs = json.loads(llm_response.text)
                if isinstance(gigs, list):
                    all_raw_gigs.extend(gigs)
                    logging.info(f"Identified {len(gigs)} gigs for {name}")
                else:
                    logging.warning(f"Unexpected JSON format from LLM for {name}.")
            except json.JSONDecodeError:
                logging.error(f"Failed to decode JSON from LLM for {name}.")
                
        except Exception as e:
            logging.error(f"Error processing {name}: {str(e)}")

    # Write the compiled raw list to the data folder
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_raw_gigs, f, indent=2, ensure_ascii=False)
    
    logging.info(f"Finished. Saved {len(all_raw_gigs)} raw gigs to {output_path}")

if __name__ == "__main__":
    run_identifier()
