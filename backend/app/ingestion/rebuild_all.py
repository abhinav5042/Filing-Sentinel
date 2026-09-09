"""
Rebuild the entire vector store from scratch, using the new table-aware
parser, from filings we already downloaded (no need to re-fetch from
SEC EDGAR).
"""

import os
from langchain_core.documents import Document
from app.ingestion.on_demand import vector_store, embed_documents_with_retry
from app.ingestion.table_aware_parsing import html_to_chunks

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")


def company_name_from_filename(filename):
    name_part = filename.split("_10K_")[0]
    return name_part.replace("_", " ")


def report(msg):
    print(msg)


if __name__ == "__main__":
    files = sorted(f for f in os.listdir(RAW_DATA_DIR) if f.endswith(".html"))
    print(f"Found {len(files)} raw filings to rebuild.\n")

    for filename in files:
        company_name = company_name_from_filename(filename)
        filepath = os.path.join(RAW_DATA_DIR, filename)

        print(f"Processing {filename} ({company_name})...")

        with open(filepath, "r", encoding="utf-8") as f:
            html_content = f.read()

        text_chunks = html_to_chunks(html_content)
        table_count = sum(1 for c in text_chunks if c["is_table"])

        documents = [
            Document(
                page_content=chunk["text"],
                metadata={
                    "company": company_name,
                    "source_file": filename,
                    "chunk_index": i,
                    "is_table": chunk["is_table"],
                },
            )
            for i, chunk in enumerate(text_chunks)
        ]

        print(f"  {len(documents)} chunks ({table_count} tables, {len(documents) - table_count} narrative)")
        embed_documents_with_retry(documents, report)
        print()

    print("Done. Vector store rebuilt with table-aware chunks for all filings.")
