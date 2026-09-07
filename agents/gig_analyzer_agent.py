import os
import json
import logging
import time
from datetime import datetime
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

def generate_with_retry(prompt, retries=3, delay=5):
    for attempt in range(retries):
        try:
            return client.models.generate_content(
                model="gemini-3.6-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
        except Exception as e:
            if "503" in str(e) and attempt < retries - 1:
                logging.warning(f"Model busy (503). Retrying analyzer in {delay}s (Attempt {attempt+1}/{retries})...")
                time.sleep(delay)
                delay *= 2
            else:
                raise e

def run_analyzer():
    raw_path = "data/gigs_raw.json"
    prompt_path = "config/analyzer_prompt.txt"
    output_path = "src/data/gigs.json"

    if not os.path.exists(raw_path):
        logging.error(f"Raw gigs file not found at {raw_path}. Run the Identifier agent first.")
        return

    with open(raw_path, "r", encoding="utf-8") as f:
        raw_gigs = json.load(f)

    if not raw_gigs:
        logging.warning("Raw gigs file is empty. Saving empty array to destination.")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as out:
            json.dump([], out, indent=2, ensure_ascii=False)
        return

    with open(prompt_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()

    current_date_str = datetime.now().strftime("%Y-%m-%d")
    system_prompt = prompt_template.replace("{{CURRENT_DATE}}", current_date_str)

    full_prompt = (
        f"{system_prompt}\n\n"
        f"Here is the raw JSON array of extracted gigs to evaluate:\n"
        f"{json.dumps(raw_gigs, ensure_ascii=False)}"
    )

    logging.info("Sending raw gigs to Gig Analyzer Agent...")

    try:
        response_llm = generate_with_retry(full_prompt)

        validated_gigs = json.loads(response_llm.text)
        
        if not isinstance(validated_gigs, list):
            logging.error("Analyzer did not return a valid JSON list.")
            return

        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(validated_gigs, f, indent=2, ensure_ascii=False)

        logging.info(f"Successfully analyzed and saved {len(validated_gigs)} approved gigs to {output_path}")

    except Exception as e:
        logging.error(f"Error during gig analysis: {str(e)}")

if __name__ == "__main__":
    run_analyzer()
