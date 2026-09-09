"""
Basic RAG query pipeline (no self-correction yet).

Loads the existing Chroma vector store, retrieves relevant chunks for a
question, and asks Gemini to answer using only that retrieved context.
This is the "naive RAG" baseline we will extend with self-correction later.
"""

import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_chroma import Chroma

load_dotenv()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma")
TOP_K = 5

PROMPT_TEMPLATE = """You are a financial analyst assistant answering questions
about SEC 10-K filings. Use ONLY the context below to answer the question.
If the context does not contain enough information to answer, say so clearly
instead of guessing.

Context:
{context}

Question: {question}

Answer:"""


def load_vector_store():
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    return Chroma(
        collection_name="sec_10k_filings",
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


def answer_question(question, vector_store, llm):
    results = vector_store.similarity_search(question, k=TOP_K)

    context = "\n\n---\n\n".join(
        f"[{doc.metadata['company']}, chunk {doc.metadata['chunk_index']}]\n{doc.page_content}"
        for doc in results
    )

    prompt = PROMPT_TEMPLATE.format(context=context, question=question)
    response = llm.invoke(prompt)

    print("\n" + "=" * 60)
    print("ANSWER:")
    print(response.content)
    print("\nSOURCES:")
    for doc in results:
        print(f"  - {doc.metadata['company']} (chunk {doc.metadata['chunk_index']})")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    print("Loading vector store...")
    vector_store = load_vector_store()

    print("Connecting to Gemini...")
    llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0)

    print("\nFilingSentinel (basic RAG) - ask a question about Apple, Tesla, Microsoft, or Amazon 10-K.")
    print("Type quit to exit.\n")

    while True:
        question = input("Your question: ").strip()
        if question.lower() in ("quit", "exit"):
            break
        if not question:
            continue
        answer_question(question, vector_store, llm)
