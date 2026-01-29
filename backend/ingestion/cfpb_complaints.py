"""CFPB Consumer Complaint Database ingestion.

Public API, no authentication required.
Docs: https://cfpb.github.io/api/ccdb/
"""

import logging
from datetime import date, timedelta

import httpx
from sqlalchemy.orm import Session

from config import settings
from models.models import CfpbComplaint, Bank

logger = logging.getLogger(__name__)

# CFPB company name mappings
BANK_CFPB_NAMES = {
    "US Bancorp": ["U.S. BANCORP", "US BANK", "U.S. BANK NATIONAL ASSOCIATION"],
    "JPMorgan Chase": ["JPMORGAN CHASE & CO.", "JPMORGAN CHASE BANK", "CHASE BANK"],
    "Wells Fargo": ["WELLS FARGO & COMPANY", "WELLS FARGO BANK"],
    "Bank of America": ["BANK OF AMERICA", "BANK OF AMERICA, NATIONAL ASSOCIATION"],
    "PNC Financial": ["PNC BANK", "PNC FINANCIAL SERVICES"],
    "Truist Financial": ["TRUIST BANK", "TRUIST FINANCIAL", "BB&T", "SUNTRUST"],
}


async def fetch_complaints(
    company_name: str,
    date_from: date | None = None,
    date_to: date | None = None,
    size: int = 100,
) -> list[dict]:
    """Fetch complaints from CFPB API for a given company."""
    if date_from is None:
        date_from = date.today() - timedelta(days=90)
    if date_to is None:
        date_to = date.today()

    params = {
        "company": company_name,
        "date_received_min": date_from.isoformat(),
        "date_received_max": date_to.isoformat(),
        "size": size,
        "sort": "created_date_desc",
        "no_aggs": "true",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(settings.cfpb_base_url, params=params)
        resp.raise_for_status()
        data = resp.json()

    hits = data.get("hits", {}).get("hits", [])
    return [h.get("_source", {}) for h in hits]


async def ingest_complaints(db: Session, bank: Bank, days_back: int = 90) -> int:
    """Fetch and store CFPB complaints for a bank."""
    cfpb_names = BANK_CFPB_NAMES.get(bank.name, [bank.name])
    total_ingested = 0

    for cfpb_name in cfpb_names:
        try:
            complaints = await fetch_complaints(cfpb_name, size=200)
        except Exception as e:
            logger.error("CFPB fetch failed for %s: %s", cfpb_name, e)
            continue

        for c in complaints:
            complaint_id = str(c.get("complaint_id", ""))
            if not complaint_id:
                continue

            existing = db.query(CfpbComplaint).filter(
                CfpbComplaint.complaint_id == complaint_id
            ).first()
            if existing:
                continue

            date_str = c.get("date_received", "")
            try:
                date_received = date.fromisoformat(date_str[:10]) if date_str else date.today()
            except ValueError:
                date_received = date.today()

            record = CfpbComplaint(
                complaint_id=complaint_id,
                bank_id=bank.id,
                date_received=date_received,
                product=c.get("product"),
                sub_product=c.get("sub_product"),
                issue=c.get("issue"),
                sub_issue=c.get("sub_issue"),
                narrative=c.get("complaint_what_happened"),
                company_response=c.get("company_response"),
                timely_response=c.get("timely") == "Yes",
                consumer_disputed=c.get("consumer_disputed") == "Yes",
            )
            db.add(record)
            total_ingested += 1

    db.commit()
    logger.info("Ingested %d complaints for %s", total_ingested, bank.name)
    return total_ingested
