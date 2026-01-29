"""NewsAPI ingestion for bank reputation monitoring.

Requires NEWSAPI_KEY in environment.
Docs: https://newsapi.org/docs
"""

import logging
from datetime import date, timedelta

import httpx
from sqlalchemy.orm import Session

from config import settings
from models.models import Signal, Bank, SignalSource
from ml.sentiment import analyze_sentiment

logger = logging.getLogger(__name__)

NEWSAPI_URL = "https://newsapi.org/v2/everything"


async def fetch_news(query: str, from_date: date | None = None, page_size: int = 50) -> list[dict]:
    """Fetch news articles from NewsAPI."""
    if not settings.newsapi_key:
        logger.warning("NEWSAPI_KEY not set, skipping news fetch")
        return []

    if from_date is None:
        from_date = date.today() - timedelta(days=7)

    params = {
        "q": query,
        "from": from_date.isoformat(),
        "sortBy": "publishedAt",
        "pageSize": page_size,
        "language": "en",
        "apiKey": settings.newsapi_key,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(NEWSAPI_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    return data.get("articles", [])


async def ingest_news(db: Session, bank: Bank, days_back: int = 7) -> int:
    """Fetch, analyze, and store news signals for a bank."""
    search_terms = f'"{bank.name}" OR "{bank.ticker}" bank'
    try:
        articles = await fetch_news(search_terms, page_size=50)
    except Exception as e:
        logger.error("News fetch failed for %s: %s", bank.name, e)
        return 0

    ingested = 0
    for article in articles:
        url = article.get("url", "")
        existing = db.query(Signal).filter(Signal.url == url, Signal.bank_id == bank.id).first()
        if existing:
            continue

        title = article.get("title", "")
        description = article.get("description", "")
        text = f"{title}. {description}" if description else title

        sentiment = analyze_sentiment(text)

        published = article.get("publishedAt")

        signal = Signal(
            bank_id=bank.id,
            source=SignalSource.NEWS,
            title=title,
            content=description,
            url=url,
            published_at=published,
            sentiment_score=sentiment["score"],
            sentiment_label=sentiment["label"],
        )
        db.add(signal)
        ingested += 1

    db.commit()
    logger.info("Ingested %d news signals for %s", ingested, bank.name)
    return ingested
