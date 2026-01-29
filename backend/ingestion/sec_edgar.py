"""SEC EDGAR filings ingestion.

Public API, no auth required (User-Agent header only).
Fetches 10-K, 10-Q, 8-K filings and extracts risk keywords.
"""

import logging
import re
from datetime import date, timedelta

import httpx
from sqlalchemy.orm import Session

from config import settings
from models.models import SECFiling, Bank
from ml.sentiment import analyze_sentiment

logger = logging.getLogger(__name__)

EDGAR_SUBMISSIONS_URL = "https://data.sec.gov/submissions/CIK{cik}.json"
EDGAR_FULL_TEXT_URL = "https://www.sec.gov/Archives/edgar/data/{cik}/{accession}/{primary_doc}"

RISK_KEYWORDS = [
    "material weakness", "restatement", "litigation", "regulatory action",
    "consent order", "enforcement", "investigation", "subpoena",
    "cybersecurity incident", "data breach", "fraud", "money laundering",
    "sanctions", "compliance failure", "credit loss", "loan loss",
    "impairment", "goodwill write-down", "restructuring", "layoff",
    "class action", "settlement", "fine", "penalty", "cease and desist",
]

HEADERS = {
    "User-Agent": settings.sec_user_agent,
    "Accept-Encoding": "gzip, deflate",
}


async def fetch_recent_filings(cik: str, filing_types: list[str] | None = None) -> list[dict]:
    """Fetch recent filing metadata from EDGAR submissions endpoint."""
    if filing_types is None:
        filing_types = ["10-K", "10-Q", "8-K"]

    padded_cik = cik.zfill(10)
    url = EDGAR_SUBMISSIONS_URL.format(cik=padded_cik)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=HEADERS)
        resp.raise_for_status()
        data = resp.json()

    recent = data.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    dates = recent.get("filingDate", [])
    accessions = recent.get("accessionNumber", [])
    primary_docs = recent.get("primaryDocument", [])

    filings = []
    for i, form in enumerate(forms):
        if form in filing_types and i < len(dates):
            accession_clean = accessions[i].replace("-", "")
            filings.append({
                "filing_type": form,
                "filed_date": dates[i],
                "accession": accessions[i],
                "url": f"https://www.sec.gov/Archives/edgar/data/{padded_cik}/{accession_clean}/{primary_docs[i]}",
            })

    return filings[:20]  # limit to 20 most recent


def _extract_risk_keywords(text: str) -> list[str]:
    """Find risk-related keywords in filing text."""
    text_lower = text.lower()
    found = [kw for kw in RISK_KEYWORDS if kw in text_lower]
    return found


async def _fetch_filing_text(url: str, max_chars: int = 50000) -> str:
    """Fetch the first N characters of a filing document."""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            text = resp.text[:max_chars]
            # Strip HTML tags for text analysis
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text
    except Exception as e:
        logger.warning("Failed to fetch filing text from %s: %s", url, e)
        return ""


async def ingest_sec_filings(db: Session, bank: Bank, days_back: int = 90) -> int:
    """Fetch and store SEC filings for a bank."""
    if not bank.cik:
        logger.warning("No CIK for %s, skipping SEC ingestion", bank.name)
        return 0

    try:
        filings = await fetch_recent_filings(bank.cik)
    except Exception as e:
        logger.error("SEC EDGAR fetch failed for %s: %s", bank.name, e)
        return 0

    cutoff = date.today() - timedelta(days=days_back)
    ingested = 0

    for f in filings:
        filed_date = date.fromisoformat(f["filed_date"])
        if filed_date < cutoff:
            continue

        existing = db.query(SECFiling).filter(
            SECFiling.bank_id == bank.id,
            SECFiling.url == f["url"],
        ).first()
        if existing:
            continue

        # Fetch filing text for keyword extraction and sentiment
        text = await _fetch_filing_text(f["url"])
        risk_keywords = _extract_risk_keywords(text) if text else []

        sentiment_score = None
        if text:
            # Analyze risk-factor sections sentiment
            risk_section = text[:2000]  # use beginning for sentiment
            sentiment = analyze_sentiment(risk_section)
            sentiment_score = sentiment["score"]

        record = SECFiling(
            bank_id=bank.id,
            cik=bank.cik,
            filing_type=f["filing_type"],
            filed_date=filed_date,
            url=f["url"],
            risk_keywords=risk_keywords,
            sentiment_score=sentiment_score,
        )
        db.add(record)
        ingested += 1

    db.commit()
    logger.info("Ingested %d SEC filings for %s", ingested, bank.name)
    return ingested
