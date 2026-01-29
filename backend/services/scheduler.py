"""APScheduler-based job scheduler for data ingestion.

Runs inside FastAPI's lifespan; all jobs use the sync wrapper
around async ingestion functions.
"""

import asyncio
import logging
from datetime import date

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from db.session import SessionLocal
from models.models import Bank
from ingestion.cfpb_complaints import ingest_complaints
from ingestion.news import ingest_news
from ingestion.yahoo_finance import ingest_market_data
from ingestion.sec_edgar import ingest_sec_filings
from ingestion.occ_enforcement import ingest_enforcement_actions
from services.risk_engine import calculate_and_store

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _run_async(coro):
    """Run an async coroutine from a sync context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _ingest_cfpb_and_news():
    """Job: ingest CFPB complaints and news for all banks."""
    logger.info("Starting CFPB + News ingestion job")
    db = SessionLocal()
    try:
        banks = db.query(Bank).all()
        for bank in banks:
            _run_async(ingest_complaints(db, bank, days_back=30))
            _run_async(ingest_news(db, bank, days_back=7))
    except Exception as e:
        logger.error("CFPB/News ingestion job failed: %s", e)
    finally:
        db.close()


def _ingest_market_data():
    """Job: ingest Yahoo Finance data for all banks."""
    logger.info("Starting market data ingestion job")
    db = SessionLocal()
    try:
        banks = db.query(Bank).all()
        for bank in banks:
            _run_async(ingest_market_data(db, bank, days_back=5))
    except Exception as e:
        logger.error("Market data ingestion job failed: %s", e)
    finally:
        db.close()


def _ingest_sec_filings():
    """Job: check for new SEC filings."""
    logger.info("Starting SEC filings ingestion job")
    db = SessionLocal()
    try:
        banks = db.query(Bank).all()
        for bank in banks:
            _run_async(ingest_sec_filings(db, bank, days_back=30))
    except Exception as e:
        logger.error("SEC filings ingestion job failed: %s", e)
    finally:
        db.close()


def _ingest_enforcement_actions():
    """Job: check for new enforcement actions."""
    logger.info("Starting enforcement actions ingestion job")
    db = SessionLocal()
    try:
        banks = db.query(Bank).all()
        for bank in banks:
            _run_async(ingest_enforcement_actions(db, bank, days_back=90))
    except Exception as e:
        logger.error("Enforcement actions ingestion job failed: %s", e)
    finally:
        db.close()


def _recalculate_scores():
    """Job: recalculate composite risk scores for all banks."""
    logger.info("Starting score recalculation job")
    db = SessionLocal()
    try:
        banks = db.query(Bank).all()
        for bank in banks:
            calculate_and_store(db, bank.id, date.today())
        logger.info("Recalculated scores for %d banks", len(banks))
    except Exception as e:
        logger.error("Score recalculation job failed: %s", e)
    finally:
        db.close()


def start_scheduler():
    """Configure and start the background scheduler."""
    # Every 6 hours: CFPB + News
    scheduler.add_job(
        _ingest_cfpb_and_news,
        trigger=IntervalTrigger(hours=6),
        id="cfpb_news",
        replace_existing=True,
    )

    # Daily at 17:00 ET (market close): Yahoo Finance
    scheduler.add_job(
        _ingest_market_data,
        trigger=CronTrigger(hour=17, minute=0),
        id="market_data",
        replace_existing=True,
    )

    # Weekly on Monday: SEC EDGAR
    scheduler.add_job(
        _ingest_sec_filings,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="sec_filings",
        replace_existing=True,
    )

    # Weekly on Monday: Enforcement actions
    scheduler.add_job(
        _ingest_enforcement_actions,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=30),
        id="enforcement_actions",
        replace_existing=True,
    )

    # Daily at 18:00: Recalculate all scores
    scheduler.add_job(
        _recalculate_scores,
        trigger=CronTrigger(hour=18, minute=0),
        id="recalculate_scores",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))


def stop_scheduler():
    """Shut down the scheduler gracefully."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
