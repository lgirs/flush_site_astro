import os
import json
import logging
from datetime import datetime
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
model = genai.GenerativeModel('gemini-2.5-flash')

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

    # Calculate current date for context injection
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    
    # Inject current date into the system prompt template
    system_prompt = prompt_template.replace("{{CURRENT_DATE}}", current_date_str)

    full_prompt = (
        f"{system_prompt}\n\n"
        f"Here is the raw JSON array of extracted gigs to evaluate:\n"
        f"{json.dumps(raw_gigs, ensure_ascii=False)}"
    )

    logging.info("Sending raw gigs to Gig Analyzer Agent for filtering and validation...")

    try:
        llm_response = model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )

        validated_gigs = json.loads(llm_response.text)
        
        if not isinstance(validated_gigs, list):
            logging.error("Analyzer did not return a valid JSON list.")
            return

        # Ensure output directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Save directly to the Astro data directory
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(validated_gigs, f, indent=2, ensure_ascii=False)

        logging.info(f"Successfully analyzed and saved {len(validated_gigs)} approved gigs to {output_path}")

    except Exception as e:
        logging.error(f"Error during gig analysis: {str(e)}")

if __name__ == "__main__":
    run_analyzer()
