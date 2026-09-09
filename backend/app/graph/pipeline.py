"""
Reusable agentic RAG pipeline logic - the LangGraph graph, plus a simple
run_query() function that both the CLI script and the FastAPI backend can call.
"""

import os
from typing import TypedDict, List
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langgraph.graph import StateGraph, END

load_dotenv()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "chroma")
TOP_K = 5
MAX_RETRIEVAL_LOOPS = 2
MAX_GENERATION_RETRIES = 1


class GraphState(TypedDict):
    question: str
    original_question: str
    company: str
    documents: List[Document]
    answer: str
    retrieval_loop_count: int
    generation_retry_count: int
    documents_relevant: bool
    generation_grounded: bool
    trace: List[str]


embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")
vector_store = Chroma(
    collection_name="sec_10k_filings",
    embedding_function=embeddings,
    persist_directory=CHROMA_DIR,
)
llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0)


def retrieve(state: GraphState) -> GraphState:
    docs = vector_store.similarity_search(
        state["question"], k=TOP_K, filter={"company": state["company"]}
    )
    state["documents"] = docs
    state["trace"].append(
        f"Retrieved {len(docs)} chunks from {state['company']} for: {state['question']}"
    )
    return state


GRADE_DOCS_PROMPT = """You are grading whether retrieved text chunks are
relevant enough to answer a question about a company's SEC 10-K filing.

Question: {question}

Retrieved chunks:
{chunks}

Are these chunks, taken together, relevant enough to answer the question?
Answer with exactly one word: YES or NO."""


def grade_documents(state: GraphState) -> GraphState:
    chunks_text = "\n\n".join(doc.page_content[:300] for doc in state["documents"])
    prompt = GRADE_DOCS_PROMPT.format(question=state["question"], chunks=chunks_text)
    response = llm.invoke(prompt)
    verdict = response.content.strip().upper()

    is_relevant = verdict.startswith("YES")
    state["documents_relevant"] = is_relevant
    state["trace"].append(f"Graded retrieved chunks as {'relevant' if is_relevant else 'not relevant enough'}")
    return state


REWRITE_PROMPT = """The following question did not retrieve good enough
results from a database of SEC 10-K filings. Rewrite it to be more specific
and likely to match relevant text in a 10-K (e.g. use terms like risk
factors, supply chain, litigation where appropriate).

Original question: {question}

Rewritten question (respond with ONLY the rewritten question, nothing else):"""


def rewrite_query(state: GraphState) -> GraphState:
    prompt = REWRITE_PROMPT.format(question=state["question"])
    response = llm.invoke(prompt)
    new_question = response.content.strip()
    state["trace"].append(f"Rewrote question to: {new_question}")
    state["question"] = new_question
    state["retrieval_loop_count"] += 1
    return state


GENERATE_PROMPT = """You are a financial analyst assistant answering questions
about SEC 10-K filings. Use ONLY the context below to answer the question.
If the context does not contain enough information to answer, say so clearly
instead of guessing.

Context:
{context}

Question: {question}

Answer:"""


def generate(state: GraphState) -> GraphState:
    context = "\n\n---\n\n".join(
        f"[{doc.metadata['company']}, chunk {doc.metadata['chunk_index']}]\n{doc.page_content}"
        for doc in state["documents"]
    )
    prompt = GENERATE_PROMPT.format(context=context, question=state["original_question"])
    response = llm.invoke(prompt)
    state["answer"] = response.content
    state["trace"].append("Generated an answer from retrieved chunks")
    return state


GRADE_GENERATION_PROMPT = """You are checking whether an answer is actually
supported by the source text it claims to be based on (i.e. not hallucinated).

Source chunks:
{chunks}

Answer to check:
{answer}

Is the answer fully grounded in the source chunks (no invented facts)?
Answer with exactly one word: YES or NO."""


def grade_generation(state: GraphState) -> GraphState:
    chunks_text = "\n\n".join(doc.page_content[:300] for doc in state["documents"])
    prompt = GRADE_GENERATION_PROMPT.format(chunks=chunks_text, answer=state["answer"])
    response = llm.invoke(prompt)
    verdict = response.content.strip().upper()

    is_grounded = verdict.startswith("YES")
    state["generation_grounded"] = is_grounded
    state["trace"].append(f"Checked answer for hallucination: {'grounded' if is_grounded else 'not fully grounded'}")
    if not is_grounded:
        state["generation_retry_count"] += 1
    return state


def route_after_grading_documents(state: GraphState) -> str:
    if state["documents_relevant"]:
        return "generate"
    if state["retrieval_loop_count"] >= MAX_RETRIEVAL_LOOPS:
        state["trace"].append("Max retrieval loops reached, generating with best-effort chunks")
        return "generate"
    return "rewrite_query"


def route_after_grading_generation(state: GraphState) -> str:
    if state["generation_grounded"]:
        return END
    if state["generation_retry_count"] >= MAX_GENERATION_RETRIES:
        state["trace"].append("Max generation retries reached, returning answer with caveat")
        return END
    return "generate"


def build_graph():
    graph = StateGraph(GraphState)

    graph.add_node("retrieve", retrieve)
    graph.add_node("grade_documents", grade_documents)
    graph.add_node("rewrite_query", rewrite_query)
    graph.add_node("generate", generate)
    graph.add_node("grade_generation", grade_generation)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "grade_documents")
    graph.add_conditional_edges(
        "grade_documents",
        route_after_grading_documents,
        {"generate": "generate", "rewrite_query": "rewrite_query"},
    )
    graph.add_edge("rewrite_query", "retrieve")
    graph.add_edge("generate", "grade_generation")
    graph.add_conditional_edges(
        "grade_generation",
        route_after_grading_generation,
        {END: END, "generate": "generate"},
    )

    return graph.compile()


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


def run_query(question, company):
    app = get_graph()

    initial_state = {
        "question": question,
        "original_question": question,
        "company": company,
        "documents": [],
        "answer": "",
        "retrieval_loop_count": 0,
        "generation_retry_count": 0,
        "documents_relevant": False,
        "generation_grounded": False,
        "trace": [],
    }

    result = app.invoke(initial_state)

    return {
        "answer": result["answer"],
        "sources": [
            {"company": doc.metadata["company"], "chunk_index": doc.metadata["chunk_index"]}
            for doc in result["documents"]
        ],
        "trace": result["trace"],
        "grounded": result["generation_grounded"],
    }
