"""Quick check: how many documents are currently stored in Chroma?"""

import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

load_dotenv()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma")

embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

vector_store = Chroma(
    collection_name="sec_10k_filings",
    embedding_function=embeddings,
    persist_directory=CHROMA_DIR,
)

count = vector_store._collection.count()
print(f"Documents currently stored in Chroma: {count}")