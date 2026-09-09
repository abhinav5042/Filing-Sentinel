"""
Fetch 10-K filings from SEC EDGAR, for one or more years, and save them locally.

SEC EDGAR requires a descriptive User-Agent header on every request
(name + working email).
"""

import requests
import json
import os
import time

HEADERS = {
    "User-Agent": "Abhinav Nandhigama abhinavnandhigama@gmail.com",
    "Accept-Encoding": "gzip, deflate",
    "Host": "www.sec.gov",
}

SUBMISSIONS_HEADERS = {
    "User-Agent": "Abhinav Nandhigama abhinavnandhigama@gmail.com",
    "Accept-Encoding": "gzip, deflate",
    "Host": "data.sec.gov",
}

REQUEST_DELAY_SECONDS = 1.0

COMPANIES = {
    "Apple": "0000320193",
    "Tesla": "0001318605",
    "Microsoft": "0000789019",
    "Amazon": "0001018724",
}

RAW_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)


def get_latest_10k_filing_info(cik, index=0):
    url = f"https://data.sec.gov/submissions/CIK{cik}.json"
    response = requests.get(url, headers=SUBMISSIONS_HEADERS)
    response.raise_for_status()
    data = response.json()

    company_name = data["name"]
    recent = data["filings"]["recent"]

    matches_found = 0
    for i, form_type in enumerate(recent["form"]):
        if form_type == "10-K":
            if matches_found == index:
                accession_number = recent["accessionNumber"][i]
                primary_document = recent["primaryDocument"][i]
                filing_date = recent["filingDate"][i]
                return {
                    "company_name": company_name,
                    "accession_number": accession_number,
                    "primary_document": primary_document,
                    "filing_date": filing_date,
                }
            matches_found += 1

    return None


def get_two_most_recent_10k_filings(cik):
    current = get_latest_10k_filing_info(cik, index=0)
    time.sleep(REQUEST_DELAY_SECONDS)
    prior = get_latest_10k_filing_info(cik, index=1)
    return current, prior


def download_filing(cik, filing_info):
    accession_no_dashes = filing_info["accession_number"].replace("-", "")
    doc_url = (
        f"https://www.sec.gov/Archives/edgar/data/"
        f"{int(cik)}/{accession_no_dashes}/{filing_info['primary_document']}"
    )

    time.sleep(REQUEST_DELAY_SECONDS)
    print(f"Downloading: {doc_url}")
    response = requests.get(doc_url, headers=HEADERS)
    response.raise_for_status()

    filename = f"{filing_info['company_name'].replace(' ', '_')}_10K_{filing_info['filing_date']}.html"
    filepath = os.path.join(RAW_DATA_DIR, filename)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(response.text)

    print(f"Saved to: {filepath}")
    return filepath


if __name__ == "__main__":
    for company_name, cik in COMPANIES.items():
        print(f"\nLooking up {company_name} most recent 10-K filing...")
        time.sleep(REQUEST_DELAY_SECONDS)
        try:
            filing_info = get_latest_10k_filing_info(cik)
            if filing_info:
                print(f"Found: {filing_info['company_name']} 10-K filed on {filing_info['filing_date']}")
                download_filing(cik, filing_info)
            else:
                print(f"No 10-K found for {company_name} - skipping.")
        except Exception as e:
            print(f"Error fetching {company_name}: {e}")

    print("\nDone. Check backend/data/raw for downloaded filings.")
