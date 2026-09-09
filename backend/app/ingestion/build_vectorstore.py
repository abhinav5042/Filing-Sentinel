"""
Step 3 of ingestion: embed all chunks using a local, free, unlimited
embedding model (BAAI/bge-small-en-v1.5) and store them in Chroma.

Since this runs locally with no API calls, there is no rate limit or daily
quota to worry about -- this just runs start to finish in one go.
"""

import os
import json
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document

load_dotenv()

CHUNKS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chunks.json")
CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma")

BATCH_SIZE = 64


def load_chunks():
    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_vector_store():
    chunks = load_chunks()
    print(f"Loaded {len(chunks)} chunks from {CHUNKS_PATH}")

    documents = [
        Document(
            page_content=chunk["text"],
            metadata={
                "company": chunk["company"],
                "source_file": chunk["source_file"],
                "chunk_index": chunk["chunk_index"],
            },
        )
        for chunk in chunks
    ]

    print("Loading local embedding model (first run downloads it, ~130MB)...")
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    vector_store = Chroma(
        collection_name="sec_10k_filings",
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )

    already_stored = vector_store._collection.count()
    if already_stored > 0:
        print(f"Found {already_stored} documents already in Chroma -- resuming from there.")
        documents = documents[already_stored:]

    if not documents:
        print("Nothing left to embed -- all documents already stored.")
        return vector_store

    print(f"Embedding {len(documents)} documents (no rate limit, should be quick)...")

    for i in range(0, len(documents), BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        vector_store.add_documents(batch)
        print(f"  Embedded {min(i + BATCH_SIZE, len(documents))}/{len(documents)} documents")

    print(f"\nDone. Vector store saved to {CHROMA_DIR}")
    return vector_store


if __name__ == "__main__":
    build_vector_store()
