"""
Step 2 of ingestion: clean the raw HTML 10-K filings and split them into
chunks suitable for embedding + retrieval.

Reads every .html file in data/raw, strips HTML down to plain text,
splits into overlapping chunks, and saves everything into a single
chunks.json file with metadata (company, source file, chunk index).
"""

import os
import json
import re
from bs4 import BeautifulSoup

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chunks.json")

CHUNK_SIZE = 1000       # characters per chunk
CHUNK_OVERLAP = 150     # characters of overlap between consecutive chunks


def clean_html_to_text(html_content: str) -> str:
    """Strip HTML tags/scripts/styles and collapse messy whitespace into clean text."""
    soup = BeautifulSoup(html_content, "html.parser")

    for tag in soup(["script", "style", "head", "meta", "link"]):
        tag.decompose()

    text = soup.get_text(separator=" ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks of roughly chunk_size characters."""
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def guess_company_from_filename(filename: str) -> str:
    """Extract a readable company name from the saved filename."""
    name = filename.split("_10K_")[0]
    return name.replace("_", " ")


def process_all_filings():
    all_chunks = []
    html_files = [f for f in os.listdir(RAW_DATA_DIR) if f.endswith(".html")]

    if not html_files:
        print(f"No .html files found in {RAW_DATA_DIR} — run fetch_10k.py first.")
        return

    for filename in html_files:
        filepath = os.path.join(RAW_DATA_DIR, filename)
        company = guess_company_from_filename(filename)

        print(f"Processing {filename} ({company})...")

        with open(filepath, "r", encoding="utf-8") as f:
            html_content = f.read()

        clean_text = clean_html_to_text(html_content)
        print(f"  Cleaned text length: {len(clean_text):,} characters")

        text_chunks = chunk_text(clean_text, CHUNK_SIZE, CHUNK_OVERLAP)
        print(f"  Split into {len(text_chunks)} chunks")

        for i, chunk in enumerate(text_chunks):
            all_chunks.append({
                "company": company,
                "source_file": filename,
                "chunk_index": i,
                "text": chunk,
            })

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2)

    print(f"\nDone. {len(all_chunks)} total chunks saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    process_all_filings()