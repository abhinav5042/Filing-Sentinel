"""
Year-over-year filing diff: ingests both the current and prior year 10-K
for a company, retrieves the risk factors section from each, and asks the
LLM to compare what changed between them.
"""

import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from app.graph.pipeline import vector_store
from app.ingestion.company_lookup import search_company
from app.ingestion.fetch_10k import get_two_most_recent_10k_filings
from app.ingestion.on_demand import ensure_specific_filing_ingested

llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0)

TOP_K = 6

DIFF_PROMPT = """You are a financial analyst comparing a company risk
factors between two consecutive annual filings (10-Ks), using ONLY the
context provided below.

Risk factors from the {prior_year} filing:
{prior_context}

Risk factors from the {current_year} filing:
{current_context}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact shape:
{{
  "summary": "2-3 sentence overview of how the risk profile changed year over year",
  "new_or_increased_risks": ["risk that is new or more prominent this year", "..."],
  "removed_or_decreased_risks": ["risk that was present last year but is gone or less prominent now", "..."]
}}

If you cannot identify a clear difference for a category, return an empty list for it
rather than guessing."""


def generate_year_over_year_diff(query):
    company = search_company(query)
    if company is None:
        raise ValueError(f"Could not find a public company matching {query}.")

    company_name = company["name"]
    cik = company["cik"]

    current_filing, prior_filing = get_two_most_recent_10k_filings(cik)
    if current_filing is None or prior_filing is None:
        raise ValueError(f"Could not find two years of 10-K filings for {company_name}.")

    current_source = ensure_specific_filing_ingested(company_name, cik, current_filing)
    prior_source = ensure_specific_filing_ingested(company_name, cik, prior_filing)

    current_docs = vector_store.similarity_search(
        "principal risk factors", k=TOP_K,
        filter={"$and": [{"company": company_name}, {"source_file": current_source}]},
    )
    prior_docs = vector_store.similarity_search(
        "principal risk factors", k=TOP_K,
        filter={"$and": [{"company": company_name}, {"source_file": prior_source}]},
    )

    current_context = "\n\n".join(doc.page_content for doc in current_docs)
    prior_context = "\n\n".join(doc.page_content for doc in prior_docs)

    prompt = DIFF_PROMPT.format(
        prior_year=prior_filing["filing_date"][:4],
        current_year=current_filing["filing_date"][:4],
        prior_context=prior_context,
        current_context=current_context,
    )

    response = llm.invoke(prompt)
    raw_text = response.content.strip()

    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        parsed = {
            "summary": "Could not generate a structured comparison from the model response.",
            "new_or_increased_risks": [],
            "removed_or_decreased_risks": [],
        }

    return {
        "company": company_name,
        "current_filing_date": current_filing["filing_date"],
        "prior_filing_date": prior_filing["filing_date"],
        "summary": parsed.get("summary", ""),
        "new_or_increased_risks": parsed.get("new_or_increased_risks", []),
        "removed_or_decreased_risks": parsed.get("removed_or_decreased_risks", []),
    }
