import logging
from agents.gig_identifier_agent import run_identifier
from agents.gig_analyzer_agent import run_analyzer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def main():
    logging.info("=== Starting Flush Venue Tracker Workflow ===")
    
    # Step 1: Crawl websites and extract raw gig data
    logging.info("Step 1: Running Gig Identifier Agent...")
    run_identifier()
    
    # Step 2: Filter by time horizon, validate quality, and output clean JSON
    logging.info("Step 2: Running Gig Analyzer Agent...")
    run_analyzer()
    
    logging.info("=== Flush Venue Tracker Workflow Complete ===")

if __name__ == "__main__":
    main()
