"""
Company lookup: search SEC official company list by name or ticker to
find the CIK needed to fetch that company filings.
"""

import os
import json
import re
import requests

HEADERS = {
    "User-Agent": "Abhinav Nandhigama abhinavnandhigama@gmail.com"
}

TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "company_tickers.json")

_SUFFIXES = [
    "corporation", "corp", "incorporated", "inc", "company", "co",
    "limited", "ltd", "llc", "plc", "holdings", "holding", "group",
    "the",
]


def _normalize(name):
    cleaned = re.sub(r"[^a-z0-9\s]", "", name.lower())
    words = [w for w in cleaned.split() if w not in _SUFFIXES]
    return " ".join(words)


def _download_company_list():
    response = requests.get(TICKERS_URL, headers=HEADERS)
    response.raise_for_status()
    data = response.json()

    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f)

    return data


def _load_company_list():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return _download_company_list()


def search_company(query):
    companies = _load_company_list()
    query_lower = query.strip().lower()

    for entry in companies.values():
        if entry["ticker"].lower() == query_lower:
            return {
                "cik": str(entry["cik_str"]).zfill(10),
                "ticker": entry["ticker"],
                "name": entry["title"],
            }

    query_norm = _normalize(query_lower)
    if query_norm:
        for entry in companies.values():
            title_norm = _normalize(entry["title"].lower())
            if query_norm in title_norm or title_norm in query_norm:
                return {
                    "cik": str(entry["cik_str"]).zfill(10),
                    "ticker": entry["ticker"],
                    "name": entry["title"],
                }

    return None


def search_companies_multi(query, limit=8):
    companies = _load_company_list()
    query_lower = query.strip().lower()
    if not query_lower:
        return []

    query_norm = _normalize(query_lower)
    ticker_matches = []
    name_matches = []
    seen_ciks = set()

    for entry in companies.values():
        cik = str(entry["cik_str"]).zfill(10)
        if cik in seen_ciks:
            continue

        ticker_lower = entry["ticker"].lower()
        title_norm = _normalize(entry["title"].lower())

        result = {"cik": cik, "ticker": entry["ticker"], "name": entry["title"]}

        if ticker_lower == query_lower or ticker_lower.startswith(query_lower):
            ticker_matches.append(result)
            seen_ciks.add(cik)
        elif query_norm and (query_norm in title_norm or title_norm.startswith(query_norm)):
            name_matches.append(result)
            seen_ciks.add(cik)

        if len(ticker_matches) + len(name_matches) >= limit * 3:
            break

    return (ticker_matches + name_matches)[:limit]


if __name__ == "__main__":
    test_queries = ["NVDA", "nvidia", "Microsoft", "Comcast Corporation", "not a real company xyz"]
    for q in test_queries:
        result = search_company(q)
        print(f"{q} -> {result}")
