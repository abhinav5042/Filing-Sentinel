"""
Filing summary generation: retrieves chunks covering a company's business
overview, key risks, and financial condition, then asks the LLM to produce
a structured summary across those three sections. Also extracts a small
set of financial metrics directly from table chunks, only when the exact
figure is quotable from the retrieved tables (never estimated).
"""

import json
import re
from langchain_google_genai import ChatGoogleGenerativeAI
from app.graph.pipeline import vector_store

llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0)

TOP_K_PER_SECTION = 4
TOP_K_TABLES = 10

SECTION_QUERIES = {
    "business_overview": "business overview, products, and services",
    "key_risks": "principal risk factors facing the business",
    "financial_highlights": "financial condition, results of operations, revenue",
}

SUMMARY_PROMPT = """You are a financial analyst producing a structured summary of a
company's SEC 10-K filing, using ONLY the context provided below.

Context - Business Overview:
{business_context}

Context - Risk Factors:
{risk_context}

Context - Financial Condition:
{financial_context}

Respond with ONLY a JSON object (no markdown, no code fences) in this exact shape:
{{
  "business_overview": "2-4 sentence summary of what the company does",
  "key_risks": ["risk 1 in one sentence", "risk 2 in one sentence", "risk 3 in one sentence", "risk 4 in one sentence"],
  "financial_highlights": "2-4 sentence summary of financial condition and results"
}}

If a section's context doesn't contain enough information, say so briefly within that field
instead of guessing."""

METRICS_PROMPT = """You are extracting specific financial figures from tables taken
directly from a company's SEC 10-K filing. The tables below are provided as Markdown.

Tables:
{table_context}

Extract these four figures ONLY if you can find the EXACT number stated in the tables
above: total revenue (most recent fiscal year), operating margin or operating income,
net income, and total cash and cash equivalents.

Also look for a units disclosure near the table (e.g. "(In millions)", "(In thousands)",
"(in millions, except per share data)") -- SEC filings state this once and it applies to
all figures in that statement.

Respond with ONLY a JSON object (no markdown, no code fences) in this exact shape:
{{
  "revenue": "exact figure as it appears, e.g. 391,035" or null,
  "operating_income_or_margin": "exact figure as it appears" or null,
  "net_income": "exact figure as it appears" or null,
  "cash_and_equivalents": "exact figure as it appears" or null,
  "units": "millions" or "thousands" or "billions" or null
}}

CRITICAL: If a figure is not clearly and exactly present in the tables above, use null
for that field. Do NOT estimate, calculate, or infer a number that isn't directly stated.
For "units", only state what is explicitly disclosed in the table's own header/caption --
use null if no units disclosure is visible in the provided context."""


SEGMENT_QUERY = "net sales revenue by reportable segment operating segments"
SEGMENT_KEYWORD_GROUPS = [["segment"]]
MIN_SEGMENT_NUMERIC_CELLS = 4


def _parse_markdown_table_for_segments(markdown: str) -> dict | None:
    lines = [line.strip() for line in markdown.strip().split("\n") if line.strip()]
    if len(lines) < 2:
        return None

    def parse_row(line: str) -> list[str]:
        cells = line.strip().strip("|").split("|")
        return [c.strip() for c in cells]

    headers = parse_row(lines[0])
    data_rows = [parse_row(line) for line in lines[2:]]
    return {"headers": headers, "rows": data_rows}


def _get_segment_revenue(company_name: str) -> dict | None:
    """Attempt to find a real segment revenue breakdown table. Returns
    None if nothing confidently matching is found (never fabricated)."""
    docs = vector_store.similarity_search(
        SEGMENT_QUERY, k=8,
        filter={"$and": [{"company": company_name}, {"is_table": True}]},
    )

    number_pattern = re.compile(r"\(?-?\$?\d[\d,]*\)?%?")

    for doc in docs:
        lowered = doc.page_content.lower()
        if "segment" not in lowered:
            continue

        parsed = _parse_markdown_table_for_segments(doc.page_content)
        if not parsed:
            continue

        numeric_count = sum(
            1 for row in parsed["rows"] for cell in row if number_pattern.fullmatch(cell.strip())
        )
        if numeric_count >= MIN_SEGMENT_NUMERIC_CELLS:
            return parsed

    return None


def _retrieve_section(company_name: str, query: str) -> tuple[str, list[dict]]:
    docs = vector_store.similarity_search(query, k=TOP_K_PER_SECTION, filter={"company": company_name})
    text = "\n\n".join(doc.page_content for doc in docs)
    sources = [{"company": doc.metadata["company"], "chunk_index": doc.metadata["chunk_index"]} for doc in docs]
    return text, sources


def _extract_json(raw_text: str) -> dict:
    raw_text = raw_text.strip()
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)
    return json.loads(raw_text)


UNITS_PATTERN = re.compile(r"\(in (millions|thousands|billions)", re.IGNORECASE)


def _detect_units(company_name: str) -> str | None:
    """Search broadly (not just table chunks) for an explicit '(in millions)'
    style disclosure, since it's usually a caption just before a table
    rather than part of the table itself. Deterministic regex match,
    not LLM-guessed, so it's reliable when present."""
    docs = vector_store.similarity_search(
        "in millions except per share amounts consolidated financial statements",
        k=6,
        filter={"company": company_name},
    )
    for doc in docs:
        match = UNITS_PATTERN.search(doc.page_content)
        if match:
            return match.group(1).lower()
    return None


def _extract_metrics(company_name: str) -> dict:
    """Pull specific financial figures directly from table chunks, only
    when exactly quotable. Uses two targeted retrieval queries (income
    statement, balance sheet) since a single blended query often misses
    the specific tables that actually contain these figures. Returns
    None values for anything not found."""
    income_docs = vector_store.similarity_search(
        "consolidated statements of operations total net sales revenue operating income",
        k=6,
        filter={"$and": [{"company": company_name}, {"is_table": True}]},
    )
    balance_docs = vector_store.similarity_search(
        "consolidated balance sheets cash and cash equivalents",
        k=6,
        filter={"$and": [{"company": company_name}, {"is_table": True}]},
    )

    all_docs = income_docs + balance_docs
    if not all_docs:
        return {
            "revenue": None,
            "operating_income_or_margin": None,
            "net_income": None,
            "cash_and_equivalents": None,
            "units": None,
        }

    table_context = "\n\n---\n\n".join(doc.page_content for doc in all_docs)
    prompt = METRICS_PROMPT.format(table_context=table_context)

    response = llm.invoke(prompt)
    try:
        result = _extract_json(response.content)
    except json.JSONDecodeError:
        result = {
            "revenue": None,
            "operating_income_or_margin": None,
            "net_income": None,
            "cash_and_equivalents": None,
            "units": None,
        }

    detected_units = _detect_units(company_name)
    if detected_units:
        result["units"] = detected_units

    return result


def generate_filing_summary(company_name: str) -> dict:
    business_context, business_sources = _retrieve_section(company_name, SECTION_QUERIES["business_overview"])
    risk_context, risk_sources = _retrieve_section(company_name, SECTION_QUERIES["key_risks"])
    financial_context, financial_sources = _retrieve_section(company_name, SECTION_QUERIES["financial_highlights"])

    prompt = SUMMARY_PROMPT.format(
        business_context=business_context,
        risk_context=risk_context,
        financial_context=financial_context,
    )

    response = llm.invoke(prompt)

    try:
        parsed = _extract_json(response.content)
    except json.JSONDecodeError:
        parsed = {
            "business_overview": "Could not generate a structured summary from the model's response.",
            "key_risks": [],
            "financial_highlights": response.content.strip()[:500],
        }

    parsed["metrics"] = _extract_metrics(company_name)
    parsed["business_overview_sources"] = business_sources
    parsed["key_risks_sources"] = risk_sources
    parsed["financial_highlights_sources"] = financial_sources
    parsed["segment_revenue"] = _get_segment_revenue(company_name)

    return parsed


def get_company_metrics(company_name):
    """Public wrapper: extract financial metrics for one company, for use in peer comparison and elsewhere."""
    return _extract_metrics(company_name)
