"""Seed demo data for development and demonstration.

Generates realistic-looking data for all 6 banks across signals,
complaints, and risk scores.
"""

import random
from datetime import date, timedelta, datetime, timezone

from sqlalchemy.orm import Session

from db.session import SessionLocal, engine
from models.base import Base
from models.models import Bank, Signal, CfpbComplaint, RiskScore, SignalSource
from config import settings


DEMO_NEWS_TEMPLATES = [
    ("{bank} reports strong Q4 earnings, beating analyst expectations", 0.7),
    ("{bank} faces regulatory scrutiny over consumer lending practices", -0.6),
    ("{bank} announces $2B technology investment for digital transformation", 0.4),
    ("{bank} settles discrimination lawsuit for $50M", -0.8),
    ("{bank} CEO addresses concerns about commercial real estate exposure", -0.3),
    ("{bank} launches new mobile banking features to compete with fintechs", 0.5),
    ("{bank} cuts 500 jobs as part of efficiency restructuring", -0.4),
    ("{bank} receives upgrade from Moody's on improved asset quality", 0.6),
    ("{bank} data breach exposes 100,000 customer records", -0.9),
    ("{bank} partners with local nonprofits for community reinvestment", 0.3),
    ("{bank} reports increase in credit card delinquencies", -0.5),
    ("{bank} named top workplace for diversity and inclusion", 0.5),
    ("{bank} under investigation for BSA/AML compliance failures", -0.7),
    ("{bank} expands wealth management division with key hires", 0.3),
    ("{bank} customers report widespread outage of online banking", -0.6),
]

COMPLAINT_PRODUCTS = [
    "Checking or savings account",
    "Credit card or prepaid card",
    "Mortgage",
    "Debt collection",
    "Credit reporting",
    "Vehicle loan or lease",
    "Student loan",
    "Money transfer",
    "Personal loan",
]

COMPLAINT_ISSUES = [
    "Managing an account",
    "Problem with a purchase shown on your statement",
    "Trouble during payment process",
    "Incorrect information on your report",
    "Struggling to pay mortgage",
    "Attempts to collect debt not owed",
    "Problem with a credit reporting company's investigation",
    "Opening an account",
    "Closing an account",
    "Problem caused by your funds being low",
]

# Bank risk profiles (some banks have higher baseline risk for realism)
BANK_RISK_PROFILES = {
    "US Bancorp": {"base_risk": 35, "volatility": 8},
    "JPMorgan Chase": {"base_risk": 30, "volatility": 10},
    "Wells Fargo": {"base_risk": 55, "volatility": 12},  # historically higher
    "Bank of America": {"base_risk": 38, "volatility": 9},
    "PNC Financial": {"base_risk": 32, "volatility": 7},
    "Truist Financial": {"base_risk": 40, "volatility": 9},
}


def seed_banks(db: Session) -> dict[str, Bank]:
    """Create bank records."""
    banks = {}
    for name, ticker in settings.bank_tickers.items():
        existing = db.query(Bank).filter(Bank.name == name).first()
        if existing:
            banks[name] = existing
            continue
        bank = Bank(name=name, ticker=ticker, display_name=name)
        db.add(bank)
        db.flush()
        banks[name] = bank
    db.commit()
    return banks


def seed_signals(db: Session, banks: dict[str, Bank], days: int = 60):
    """Generate demo news signals."""
    for bank_name, bank in banks.items():
        for day_offset in range(days):
            d = date.today() - timedelta(days=day_offset)
            # 2-5 articles per day
            num_articles = random.randint(2, 5)
            for _ in range(num_articles):
                template, base_sentiment = random.choice(DEMO_NEWS_TEMPLATES)
                title = template.format(bank=bank_name)
                # Add some noise to sentiment
                sentiment = max(-1.0, min(1.0, base_sentiment + random.gauss(0, 0.15)))
                label = "positive" if sentiment > 0.1 else ("negative" if sentiment < -0.1 else "neutral")

                signal = Signal(
                    bank_id=bank.id,
                    source=SignalSource.NEWS,
                    title=title,
                    content=f"Demo article about {bank_name}.",
                    url=f"https://example.com/news/{bank.ticker.lower()}/{day_offset}/{random.randint(1000,9999)}",
                    published_at=datetime(d.year, d.month, d.day, random.randint(6, 22), random.randint(0, 59), tzinfo=timezone.utc),
                    sentiment_score=round(sentiment, 3),
                    sentiment_label=label,
                    is_anomaly=abs(sentiment) > 0.85,
                )
                db.add(signal)

    db.commit()


def seed_complaints(db: Session, banks: dict[str, Bank], days: int = 90):
    """Generate demo CFPB complaints."""
    complaint_counter = 100000
    for bank_name, bank in banks.items():
        profile = BANK_RISK_PROFILES[bank_name]
        daily_rate = 3 + (profile["base_risk"] / 15)

        for day_offset in range(days):
            d = date.today() - timedelta(days=day_offset)
            num = max(0, int(random.gauss(daily_rate, daily_rate * 0.3)))
            for _ in range(num):
                complaint_counter += 1
                complaint = CfpbComplaint(
                    complaint_id=str(complaint_counter),
                    bank_id=bank.id,
                    date_received=d,
                    product=random.choice(COMPLAINT_PRODUCTS),
                    issue=random.choice(COMPLAINT_ISSUES),
                    company_response=random.choice(["Closed with explanation", "Closed with monetary relief", "Closed with non-monetary relief"]),
                    timely_response=random.random() > 0.1,
                    consumer_disputed=random.random() > 0.7,
                )
                db.add(complaint)

    db.commit()


def seed_risk_scores(db: Session, banks: dict[str, Bank], days: int = 60):
    """Generate historical risk scores."""
    for bank_name, bank in banks.items():
        profile = BANK_RISK_PROFILES[bank_name]
        score = profile["base_risk"]

        for day_offset in range(days, -1, -1):
            d = date.today() - timedelta(days=day_offset)
            # Random walk
            score += random.gauss(0, profile["volatility"] * 0.1)
            score = max(5, min(95, score))

            media = max(0, min(100, score + random.gauss(0, 5)))
            complaints = max(0, min(100, score + random.gauss(5, 8)))
            market = max(0, min(100, score + random.gauss(-5, 6)))

            rs = RiskScore(
                bank_id=bank.id,
                score_date=d,
                composite_score=round(score, 1),
                media_sentiment_score=round(media, 1),
                complaint_score=round(complaints, 1),
                market_score=round(market, 1),
            )
            db.add(rs)

    db.commit()


def seed_all():
    """Run all seeders."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        banks = seed_banks(db)
        print(f"Seeded {len(banks)} banks")

        seed_signals(db, banks)
        print("Seeded news signals")

        seed_complaints(db, banks)
        print("Seeded CFPB complaints")

        seed_risk_scores(db, banks)
        print("Seeded risk scores")

        print("Demo data seeding complete!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
