"""Yahoo Finance market data ingestion.

Uses yfinance library (no API key required).
Fetches daily OHLCV + computes 30-day rolling volatility.
"""

import logging
from datetime import date, timedelta

import yfinance as yf
import numpy as np
from sqlalchemy.orm import Session

from models.models import MarketData, Bank

logger = logging.getLogger(__name__)


async def ingest_market_data(db: Session, bank: Bank, days_back: int = 60) -> int:
    """Fetch and store daily market data for a bank's ticker."""
    start = date.today() - timedelta(days=days_back + 40)  # extra for volatility calc
    end = date.today()

    try:
        ticker = yf.Ticker(bank.ticker)
        df = ticker.history(start=start.isoformat(), end=end.isoformat())
    except Exception as e:
        logger.error("Yahoo Finance fetch failed for %s: %s", bank.ticker, e)
        return 0

    if df.empty:
        logger.warning("No market data returned for %s", bank.ticker)
        return 0

    df = df.reset_index()
    df["daily_return_pct"] = df["Close"].pct_change() * 100.0
    df["volatility_30d"] = df["daily_return_pct"].rolling(window=30).std()

    ingested = 0
    for _, row in df.iterrows():
        trade_date = row["Date"].date() if hasattr(row["Date"], "date") else row["Date"]

        existing = db.query(MarketData).filter(
            MarketData.bank_id == bank.id,
            MarketData.date == trade_date,
        ).first()
        if existing:
            continue

        record = MarketData(
            bank_id=bank.id,
            date=trade_date,
            close_price=round(float(row["Close"]), 2),
            daily_return_pct=round(float(row["daily_return_pct"]), 4) if not np.isnan(row["daily_return_pct"]) else None,
            volume=int(row["Volume"]),
            volatility_30d=round(float(row["volatility_30d"]), 4) if not np.isnan(row["volatility_30d"]) else None,
        )
        db.add(record)
        ingested += 1

    db.commit()
    logger.info("Ingested %d market data rows for %s", ingested, bank.ticker)
    return ingested
