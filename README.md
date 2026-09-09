# Agentic RAG over SEC 10-K Filings

Portfolio project: a self-correcting (agentic) RAG system that answers questions
about Apple, Tesla, Microsoft, and Amazon's SEC 10-K filings.

## Status
This is the project skeleton. No ingestion/RAG/agent code has been written yet —
we're building it step by step. Check back here after each session for what's new.

## Folder structure
```
agentic-rag/
├── backend/
│   ├── app/
│   │   ├── ingestion/   # scripts to pull + chunk SEC 10-Ks (not built yet)
│   │   ├── graph/       # LangGraph agentic RAG pipeline (not built yet)
│   │   └── api/         # FastAPI endpoints (not built yet)
│   ├── data/
│   │   ├── raw/         # downloaded 10-K files land here
│   │   └── chroma/      # vector DB storage
│   ├── requirements.txt
│   ├── .env             # YOUR Gemini API key goes here (never commit this)
│   └── .env.example     # safe template, shows what .env needs
└── frontend/            # React app (not built yet)
```

## Setup (Windows)

1. **Install Python 3.11** (recommended over very new versions like 3.14, for
   package compatibility with chromadb/langgraph). Get it from
   https://www.python.org/downloads/release — check "Add python.exe to PATH"
   during install.

2. **Open Command Prompt in this folder** (the one containing this README),
   then create and activate a virtual environment:
   ```
   py -3.11 -m venv venv
   venv\Scripts\activate
   ```
   You should see `(venv)` at the start of your prompt line.

3. **Install dependencies:**
   ```
   cd backend
   pip install -r requirements.txt
   ```

4. **Add your Gemini API key:**
   Open `backend/.env` in Notepad and replace `PASTE_YOUR_GEMINI_KEY_HERE`
   with your actual key from https://aistudio.google.com/api-keys.
   This file is already excluded from git via `.gitignore` — never commit it.

5. Let me know once `pip install` finishes (or if it errors) and we'll move to
   the next step: pulling the 10-K filings from SEC EDGAR.
