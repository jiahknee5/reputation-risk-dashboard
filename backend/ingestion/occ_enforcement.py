"""OCC/FDIC enforcement actions ingestion.

Parses public enforcement action data from OCC and FDIC websites.
No authentication required.
"""

import logging
import re
from datetime import date, timedelta

import httpx
from sqlalchemy.orm import Session

from models.models import EnforcementAction, Bank

logger = logging.getLogger(__name__)

# OCC enforcement actions search endpoint
OCC_SEARCH_URL = "https://apps.occ.gov/EASearch/api/EnforcementActions/Search"

# Bank name variants for OCC/FDIC matching
BANK_ENFORCEMENT_NAMES = {
    "US Bancorp": ["U.S. Bancorp", "US Bank", "U.S. Bank"],
    "JPMorgan Chase": ["JPMorgan Chase", "JP Morgan Chase", "Chase Bank"],
    "Wells Fargo": ["Wells Fargo"],
    "Bank of America": ["Bank of America"],
    "PNC Financial": ["PNC Bank", "PNC Financial"],
    "Truist Financial": ["Truist", "BB&T", "SunTrust"],
}

# Severity mapping by action type
ACTION_SEVERITY = {
    "Cease and Desist Order": 5,
    "Consent Order": 4,
    "Civil Money Penalty": 4,
    "Formal Agreement": 3,
    "Prompt Corrective Action": 5,
    "Removal/Prohibition": 5,
    "Safety and Soundness Order": 4,
    "Change in Bank Control": 2,
    "Capital Directive": 3,
    "Memorandum of Understanding": 2,
}


async def fetch_occ_actions(bank_name: str, days_back: int = 365) -> list[dict]:
    """Fetch enforcement actions from OCC search API."""
    start_date = (date.today() - timedelta(days=days_back)).isoformat()

    payload = {
        "bankName": bank_name,
        "fromDate": start_date,
        "toDate": date.today().isoformat(),
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(OCC_SEARCH_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else data.get("results", [])
    except Exception as e:
        logger.warning("OCC search failed for %s: %s", bank_name, e)
        return []


def _determine_severity(action_type: str) -> int:
    """Map action type to severity score (1-5)."""
    for key, severity in ACTION_SEVERITY.items():
        if key.lower() in action_type.lower():
            return severity
    return 2  # default moderate severity


def _extract_penalty_amount(description: str) -> float | None:
    """Extract dollar penalty amount from description text."""
    if not description:
        return None
    match = re.search(r"\$[\d,]+(?:\.\d+)?(?:\s*(?:million|billion))?", description, re.IGNORECASE)
    if not match:
        return None
    amount_str = match.group().replace("$", "").replace(",", "")
    try:
        amount = float(re.sub(r"[^\d.]", "", amount_str))
        text = match.group().lower()
        if "billion" in text:
            amount *= 1_000_000_000
        elif "million" in text:
            amount *= 1_000_000
        return amount
    except ValueError:
        return None


async def ingest_enforcement_actions(db: Session, bank: Bank, days_back: int = 365) -> int:
    """Fetch and store enforcement actions for a bank."""
    name_variants = BANK_ENFORCEMENT_NAMES.get(bank.name, [bank.name])
    ingested = 0

    for name in name_variants:
        actions = await fetch_occ_actions(name, days_back)

        for action in actions:
            action_id = str(action.get("id", action.get("actionId", "")))
            if not action_id:
                continue

            existing = db.query(EnforcementAction).filter(
                EnforcementAction.action_id == action_id,
            ).first()
            if existing:
                continue

            action_type = action.get("actionType", action.get("type", "Unknown"))
            description = action.get("description", action.get("title", ""))
            action_date_str = action.get("actionDate", action.get("date", ""))

            try:
                action_date = date.fromisoformat(action_date_str[:10]) if action_date_str else date.today()
            except ValueError:
                action_date = date.today()

            record = EnforcementAction(
                action_id=action_id,
                bank_id=bank.id,
                agency=action.get("agency", "OCC"),
                action_date=action_date,
                action_type=action_type,
                description=description,
                penalty_amount=_extract_penalty_amount(description),
                severity=_determine_severity(action_type),
            )
            db.add(record)
            ingested += 1

    db.commit()
    logger.info("Ingested %d enforcement actions for %s", ingested, bank.name)
    return ingested
