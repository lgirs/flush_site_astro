import os
import json
import logging
import requests
from bs4 import BeautifulSoup
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logging.error("GEMINI_API_KEY is missing. Please add it to your .env file.")
    exit(1)

client = genai.Client(api_key=api_key)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,fi;q=0.8",
}

def clean_html_text(html_content: str) -> str:
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
            response = requests.get(url, headers=HEADERS, timeout=15)
            response.raise_for_status()
            
            cleaned_text = clean_html_text(response.text)[:20000] 
            
            full_prompt = (
                f"{system_prompt}\n\n"
                f"Context: You are looking at the website for {name} located in {city}.\n\n"
                f"Here is the scraped text:\n{cleaned_text}"
            )
            
            # Use gemini-3.6-flash via the Google GenAI SDK client
            response_llm = client.models.generate_content(
                model="gemini-3.6-flash",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            try:
                gigs = json.loads(response_llm.text)
                if isinstance(gigs, list):
                    all_raw_gigs.extend(gigs)
                    logging.info(f"Identified {len(gigs)} gigs for {name}")
                else:
                    logging.warning(f"Unexpected JSON format from LLM for {name}.")
            except json.JSONDecodeError:
                logging.error(f"Failed to decode JSON from LLM for {name}.")
                
        except Exception as e:
            logging.error(f"Error processing {name}: {str(e)}")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_raw_gigs, f, indent=2, ensure_ascii=False)
    
    logging.info(f"Finished. Saved {len(all_raw_gigs)} raw gigs to {output_path}")

if __name__ == "__main__":
    run_identifier()
