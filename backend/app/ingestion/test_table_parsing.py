"""Quick manual test: run the table-aware parser on an already-downloaded
filing and show a sample of what it produces."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.ingestion.table_aware_parsing import html_to_chunks

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")

if __name__ == "__main__":
    files = [f for f in os.listdir(RAW_DATA_DIR) if f.endswith(".html")]
    print("Available raw filings:")
    for f in files:
        print(f"  {f}")

    filename = input("\nEnter a filename to test (or part of it): ").strip()
    matches = [f for f in files if filename.lower() in f.lower()]
    if not matches:
        print("No match found.")
        exit()

    filepath = os.path.join(RAW_DATA_DIR, matches[0])
    print(f"\nParsing: {matches[0]}")

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()

    chunks = html_to_chunks(html_content)
    table_chunks = [c for c in chunks if c["is_table"]]
    narrative_chunks = [c for c in chunks if not c["is_table"]]

    print(f"\nTotal chunks: {len(chunks)}")
    print(f"  Narrative chunks: {len(narrative_chunks)}")
    print(f"  Table chunks: {len(table_chunks)}")

    if table_chunks:
        print("\n--- Sample table chunk ---")
        print(table_chunks[0]["text"][:800])
        print("...")
