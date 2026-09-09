"""
FastAPI backend for FilingSentinel.
"""

import time
import secrets
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.graph.pipeline import run_query
from app.graph.summary import generate_filing_summary, get_company_metrics
from app.graph.diff import generate_year_over_year_diff
from app.graph.financials import get_financial_tables
from app.ingestion.on_demand import ensure_company_ingested
from app.ingestion.company_lookup import search_companies_multi, search_company
from app.ingestion.fetch_10k import get_latest_10k_filing_info
from app.api.database import init_db, get_db, User, Memo, WatchlistEntry
from app.api.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.api.email_service import send_verification_email

app = FastAPI(title="FilingSentinel API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

security = HTTPBearer()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class QueryRequest(BaseModel):
    question: str
    company: str


class QueryResponse(BaseModel):
    answer: str
    sources: list
    trace: list
    grounded: bool


class CompanySearchResult(BaseModel):
    cik: str
    ticker: str
    name: str


class SummaryRequest(BaseModel):
    company: str


class SummaryResponse(BaseModel):
    company: str
    business_overview: str
    key_risks: list
    financial_highlights: str
    metrics: dict
    business_overview_sources: list
    key_risks_sources: list
    financial_highlights_sources: list
    segment_revenue: dict | None


class DiffRequest(BaseModel):
    company: str


class DiffResponse(BaseModel):
    company: str
    current_filing_date: str
    prior_filing_date: str
    summary: str
    new_or_increased_risks: list
    removed_or_decreased_risks: list


class FinancialsRequest(BaseModel):
    company: str


class FinancialsResponse(BaseModel):
    company: str
    income_statement: dict | None
    balance_sheet: dict | None
    cash_flow: dict | None


class MemoCreateRequest(BaseModel):
    company: str
    title: str
    content: str


class MemoResponse(BaseModel):
    id: int
    company: str
    title: str
    content: str
    created_at: str
    updated_at: str


class WatchlistAddRequest(BaseModel):
    company: str


class WatchlistResponse(BaseModel):
    id: int
    company: str
    cik: str
    last_seen_filing_date: str | None
    latest_filing_date: str | None
    has_new_filing: bool
    added_at: str


class MeResponse(BaseModel):
    email: str
    full_name: str | None
    is_verified: bool


class UpdateProfileRequest(BaseModel):
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str




class PeerComparisonRequest(BaseModel):
    companies: list[str]


class PeerCompanyMetrics(BaseModel):
    company: str
    metrics: dict


class PeerComparisonResponse(BaseModel):
    results: list[PeerCompanyMetrics]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    return user


@app.get("/")
def health_check():
    return {"status": "FilingSentinel API is running"}


@app.post("/signup", response_model=TokenResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    verification_token = secrets.token_urlsafe(32)

    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        full_name=request.full_name,
        is_verified=False,
        verification_token=verification_token,
    )
    db.add(new_user)
    db.commit()

    try:
        send_verification_email(new_user.email, verification_token)
    except Exception as e:
        print(f"Warning: failed to send verification email: {e}")

    token = create_access_token({"sub": new_user.email})
    return {"access_token": token}


@app.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token({"sub": user.email})
    return {"access_token": token}


@app.get("/verify-email", response_class=HTMLResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == token).first()
    if not user:
        return "<h2>Invalid or expired verification link.</h2>"

    user.is_verified = True
    user.verification_token = None
    db.commit()

    return "<h2>Email verified.</h2><p>You can close this tab and return to FilingSentinel.</p>"


@app.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
    }


@app.put("/account/profile", response_model=MeResponse)
def update_profile(request: UpdateProfileRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.full_name = request.full_name
    db.commit()
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_verified": current_user.is_verified,
    }


@app.post("/account/change-password")
def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.hashed_password = hash_password(request.new_password)
    db.commit()
    return {"status": "password changed"}


@app.post("/account/resend-verification")
def resend_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.is_verified:
        return {"status": "already verified"}

    verification_token = secrets.token_urlsafe(32)
    current_user.verification_token = verification_token
    db.commit()

    try:
        send_verification_email(current_user.email, verification_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    return {"status": "verification email sent"}


@app.get("/stats")
def stats(current_user: User = Depends(get_current_user)):
    from app.graph.pipeline import vector_store
    all_docs = vector_store._collection.get()
    companies = set()
    for metadata in all_docs["metadatas"]:
        companies.add(metadata["company"])
    return {
        "companies_indexed": len(companies),
        "chunks_indexed": len(all_docs["ids"]),
    }


@app.get("/companies/search", response_model=list[CompanySearchResult])
def companies_search(q: str, current_user: User = Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return []
    return search_companies_multi(q)


@app.post("/summary", response_model=SummaryResponse)
def summary(request: SummaryRequest, current_user: User = Depends(get_current_user)):
    try:
        resolved_company = ensure_company_ingested(request.company)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = generate_filing_summary(resolved_company["name"])
    return {
        "company": resolved_company["name"],
        "business_overview": result.get("business_overview", ""),
        "key_risks": result.get("key_risks", []),
        "financial_highlights": result.get("financial_highlights", ""),
        "metrics": result.get("metrics", {}),
        "business_overview_sources": result.get("business_overview_sources", []),
        "key_risks_sources": result.get("key_risks_sources", []),
        "financial_highlights_sources": result.get("financial_highlights_sources", []),
        "segment_revenue": result.get("segment_revenue"),
    }


@app.post("/diff", response_model=DiffResponse)
def diff(request: DiffRequest, current_user: User = Depends(get_current_user)):
    try:
        result = generate_year_over_year_diff(request.company)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@app.post("/financials", response_model=FinancialsResponse)
def financials(request: FinancialsRequest, current_user: User = Depends(get_current_user)):
    try:
        resolved_company = ensure_company_ingested(request.company)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = get_financial_tables(resolved_company["name"])
    return {
        "company": resolved_company["name"],
        "income_statement": result.get("income_statement"),
        "balance_sheet": result.get("balance_sheet"),
        "cash_flow": result.get("cash_flow"),
    }


@app.post("/memos", response_model=MemoResponse)
def create_memo(request: MemoCreateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memo = Memo(
        user_id=current_user.id,
        company=request.company,
        title=request.title,
        content=request.content,
    )
    db.add(memo)
    db.commit()
    db.refresh(memo)
    return {
        "id": memo.id,
        "company": memo.company,
        "title": memo.title,
        "content": memo.content,
        "created_at": memo.created_at.isoformat(),
        "updated_at": memo.updated_at.isoformat() if memo.updated_at else memo.created_at.isoformat(),
    }


@app.get("/memos", response_model=list[MemoResponse])
def list_memos(company: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memos = (
        db.query(Memo)
        .filter(Memo.user_id == current_user.id, Memo.company == company)
        .order_by(Memo.created_at.desc())
        .all()
    )
    return [
        {
            "id": m.id,
            "company": m.company,
            "title": m.title,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
            "updated_at": m.updated_at.isoformat() if m.updated_at else m.created_at.isoformat(),
        }
        for m in memos
    ]


@app.delete("/memos/{memo_id}")
def delete_memo(memo_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    memo = db.query(Memo).filter(Memo.id == memo_id, Memo.user_id == current_user.id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="Memo not found.")
    db.delete(memo)
    db.commit()
    return {"status": "deleted"}


@app.post("/watchlist", response_model=WatchlistResponse)
def add_to_watchlist(request: WatchlistAddRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    company = search_company(request.company)
    if company is None:
        raise HTTPException(status_code=404, detail=f"Could not find a public company matching {request.company}.")

    existing = db.query(WatchlistEntry).filter(
        WatchlistEntry.user_id == current_user.id, WatchlistEntry.cik == company["cik"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"{company['name']} is already on your watchlist.")

    filing_info = get_latest_10k_filing_info(company["cik"])
    latest_date = filing_info["filing_date"] if filing_info else None

    entry = WatchlistEntry(
        user_id=current_user.id,
        company=company["name"],
        cik=company["cik"],
        last_seen_filing_date=latest_date,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "id": entry.id,
        "company": entry.company,
        "cik": entry.cik,
        "last_seen_filing_date": entry.last_seen_filing_date,
        "latest_filing_date": latest_date,
        "has_new_filing": False,
        "added_at": entry.added_at.isoformat(),
    }


@app.get("/watchlist", response_model=list[WatchlistResponse])
def get_watchlist(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entries = db.query(WatchlistEntry).filter(WatchlistEntry.user_id == current_user.id).all()

    results = []
    for i, entry in enumerate(entries):
        if i > 0:
            time.sleep(0.5)

        filing_info = get_latest_10k_filing_info(entry.cik)
        latest_date = filing_info["filing_date"] if filing_info else None
        has_new = bool(latest_date and entry.last_seen_filing_date and latest_date > entry.last_seen_filing_date)

        results.append({
            "id": entry.id,
            "company": entry.company,
            "cik": entry.cik,
            "last_seen_filing_date": entry.last_seen_filing_date,
            "latest_filing_date": latest_date,
            "has_new_filing": has_new,
            "added_at": entry.added_at.isoformat(),
        })

    return results


@app.post("/watchlist/{entry_id}/acknowledge")
def acknowledge_watchlist_alert(entry_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.id == entry_id, WatchlistEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found.")

    filing_info = get_latest_10k_filing_info(entry.cik)
    if filing_info:
        entry.last_seen_filing_date = filing_info["filing_date"]
        db.commit()

    return {"status": "acknowledged"}


@app.delete("/watchlist/{entry_id}")
def remove_from_watchlist(entry_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.id == entry_id, WatchlistEntry.user_id == current_user.id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Watchlist entry not found.")
    db.delete(entry)
    db.commit()
    return {"status": "removed"}




@app.post("/peer-comparison", response_model=PeerComparisonResponse)
def peer_comparison(request: PeerComparisonRequest, current_user: User = Depends(get_current_user)):
    if len(request.companies) < 2 or len(request.companies) > 4:
        raise HTTPException(status_code=400, detail="Provide between 2 and 4 companies to compare.")

    results = []
    for company_query in request.companies:
        try:
            resolved = ensure_company_ingested(company_query)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        metrics = get_company_metrics(resolved["name"])
        results.append({"company": resolved["name"], "metrics": metrics})

    return {"results": results}


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest, current_user: User = Depends(get_current_user)):
    try:
        resolved_company = ensure_company_ingested(request.company)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    result = run_query(request.question, resolved_company["name"])
    return result



