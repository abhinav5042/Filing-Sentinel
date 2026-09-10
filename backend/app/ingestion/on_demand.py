"""
On-demand ingestion: given a company name/ticker, check if it already in
Chroma. If not, fetch its latest 10-K from SEC EDGAR, table-aware parse it,
chunk it, and embed it -- all automatically, so any of ~10,000 US public
companies can be queried without pre-loading everything in advance.
"""

import os
import time
from dotenv import load_dotenv
from langchain_cohere import CohereEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.ingestion.company_lookup import search_company
from app.ingestion.fetch_10k import get_latest_10k_filing_info, download_filing
from app.ingestion.table_aware_parsing import html_to_chunks

load_dotenv()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma")
RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
EMBED_BATCH_SIZE = 90
EMBED_DELAY = 0.7

embeddings = CohereEmbeddings(model="embed-english-v3.0")
vector_store = Chroma(
    collection_name="sec_10k_filings",
    embedding_function=embeddings,
    persist_directory=CHROMA_DIR,
)

MAX_RETRIES = 2


def get_already_embedded_count(source_file):
    result = vector_store._collection.get(where={"source_file": source_file})
    return len(result["ids"])


def embed_documents_with_retry(documents, report):
    if not documents:
        return 0

    already_embedded = get_already_embedded_count(documents[0].metadata["source_file"])
    remaining = documents[already_embedded:]

    if not remaining:
        return 0

    embedded_this_run = 0
    for i in range(0, len(remaining), EMBED_BATCH_SIZE):
        batch = remaining[i:i + EMBED_BATCH_SIZE]
        succeeded = False

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                vector_store.add_documents(batch)
                succeeded = True
                break
            except Exception as e:
                if "429" in str(e) or "ResourceExhausted" in str(e) or "quota" in str(e).lower() or "rate limit" in str(e).lower():
                    wait_time = EMBED_DELAY * (2 ** attempt)
                    report(f"  Rate limited, waiting {wait_time:.0f}s (retry {attempt}/{MAX_RETRIES})...")
                    time.sleep(wait_time)
                else:
                    raise

        if not succeeded:
            report(
                f"Hit the daily embedding quota after {already_embedded + embedded_this_run} "
                f"of {len(documents)} chunks. The rest will finish automatically the next "
                f"time this company is queried."
            )
            return embedded_this_run

        embedded_this_run += len(batch)
        report(f"  Embedded {already_embedded + embedded_this_run}/{len(documents)} chunks")
        time.sleep(EMBED_DELAY)

    return embedded_this_run


def company_already_ingested(company_name):
    result = vector_store._collection.get(where={"company": company_name}, limit=1)
    return len(result["ids"]) > 0


def specific_filing_already_ingested(source_file):
    result = vector_store._collection.get(where={"source_file": source_file}, limit=1)
    return len(result["ids"]) > 0


def ensure_specific_filing_ingested(company_name, cik, filing_info, progress_callback=None):
    def report(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    expected_filename = f"{company_name.replace(' ', '_')}_10K_{filing_info['filing_date']}.html"
    expected_filepath = os.path.join(RAW_DATA_DIR, expected_filename)

    if specific_filing_already_ingested(expected_filename):
        report(f"{company_name} filing from {filing_info['filing_date']} is already available.")
        return expected_filename

    if os.path.exists(expected_filepath):
        report(f"Using previously downloaded {company_name} filing from {filing_info['filing_date']}.")
        filepath = expected_filepath
    else:
        report(f"Downloading {company_name} filing from {filing_info['filing_date']}...")
        filepath = download_filing(cik, filing_info)

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()
    text_chunks = html_to_chunks(html_content)

    documents = [
        Document(
            page_content=chunk["text"],
            metadata={
                "company": company_name,
                "source_file": os.path.basename(filepath),
                "chunk_index": i,
                "is_table": chunk["is_table"],
            },
        )
        for i, chunk in enumerate(text_chunks)
    ]

    report(f"Embedding {len(documents)} chunks from the {filing_info['filing_date']} filing...")
    embed_documents_with_retry(documents, report)
    report(f"{company_name} filing from {filing_info['filing_date']} is ready.")

    return expected_filename


def ensure_company_ingested(query, progress_callback=None):
    def report(msg):
        print(msg)
        if progress_callback:
            progress_callback(msg)

    company = search_company(query)
    if company is None:
        raise ValueError(f"Could not find a public company matching {query}.")

    company_name = company["name"]

    filing_info = get_latest_10k_filing_info(company["cik"])
    if filing_info is None:
        raise ValueError(f"No 10-K filing found for {company_name}.")

    expected_filename = f"{company_name.replace(' ', '_')}_10K_{filing_info['filing_date']}.html"
    expected_filepath = os.path.join(RAW_DATA_DIR, expected_filename)

    if os.path.exists(expected_filepath):
        report(f"Using previously downloaded {company_name} 10-K.")
        filepath = expected_filepath
    else:
        report(f"Downloading {company_name} 10-K filed on {filing_info['filing_date']}...")
        filepath = download_filing(company["cik"], filing_info)

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()
    text_chunks = html_to_chunks(html_content)

    documents = [
        Document(
            page_content=chunk["text"],
            metadata={
                "company": company_name,
                "source_file": os.path.basename(filepath),
                "chunk_index": i,
                "is_table": chunk["is_table"],
            },
        )
        for i, chunk in enumerate(text_chunks)
    ]

    already_embedded = get_already_embedded_count(expected_filename)

    if already_embedded >= len(documents):
        report(f"{company_name} is already fully available.")
        return company

    if already_embedded > 0:
        report(f"{company_name} was partially loaded ({already_embedded}/{len(documents)} chunks) -- resuming.")
    else:
        report(f"{company_name} has not been loaded yet -- embedding {len(documents)} chunks now...")

    embedded_count = embed_documents_with_retry(documents, report)
    total_now = already_embedded + embedded_count

    if total_now < len(documents):
        report(
            f"{company_name} is partially loaded ({total_now}/{len(documents)} chunks). "
            f"You can still ask questions now -- answers will improve as the rest finishes."
        )
    else:
        report(f"{company_name} is fully ready to query.")

    return company


if __name__ == "__main__":
    test_company = input("Enter a company name or ticker to test: ").strip()
    result = ensure_company_ingested(test_company)
    print(f"\nResolved company: {result}")


