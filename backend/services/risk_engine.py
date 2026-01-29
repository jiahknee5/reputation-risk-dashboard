"""Composite Reputation Risk Score Engine.

Calculates a 0-100 score combining multiple signal components.
Higher score = higher risk.

Production version uses 5 components: media sentiment, regulatory,
complaints, market, and peer-relative.
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.models import (
    Signal, RiskScore, CfpbComplaint, Bank, SignalSource,
    MarketData, EnforcementAction, SECFiling,
)


PROD_WEIGHTS = {
    "media_sentiment": 0.25,
    "regulatory": 0.25,
    "complaints": 0.20,
    "market": 0.15,
    "peer_relative": 0.15,
}


def _sentiment_to_risk(avg_sentiment: float | None) -> float:
    """Convert average sentiment (-1 to 1) to risk score (0-100)."""
    if avg_sentiment is None:
        return 50.0
    return max(0.0, min(100.0, (1.0 - avg_sentiment) * 50.0))


def _complaint_risk(complaint_count: int, avg_narrative_sentiment: float | None = None) -> float:
    """Score complaint volume + narrative sentiment on 0-100 scale.

    Volume accounts for 70%, narrative sentiment for 30%.
    """
    volume_score = min(complaint_count / 500.0, 1.0) * 100.0

    if avg_narrative_sentiment is not None:
        sentiment_risk = _sentiment_to_risk(avg_narrative_sentiment)
        return volume_score * 0.7 + sentiment_risk * 0.3

    return volume_score


def _market_risk(db: Session, bank_id: int, lookback_days: int = 30) -> float:
    """Compute market risk from real Yahoo Finance data.

    Uses 30-day return + latest 30-day volatility.
    Return contributes 60%, volatility 40%.
    """
    start_date = date.today() - timedelta(days=lookback_days)

    latest = (
        db.query(MarketData)
        .filter(MarketData.bank_id == bank_id, MarketData.date >= start_date)
        .order_by(MarketData.date.desc())
        .first()
    )
    earliest = (
        db.query(MarketData)
        .filter(MarketData.bank_id == bank_id, MarketData.date >= start_date)
        .order_by(MarketData.date.asc())
        .first()
    )

    if not latest or not earliest or not earliest.close_price:
        return 50.0  # neutral if no data

    # 30-day return
    price_change_pct = ((latest.close_price - earliest.close_price) / earliest.close_price) * 100.0
    # Map +10% → 0 risk, -10% → 100 risk
    return_risk = max(0.0, min(100.0, ((-price_change_pct + 10.0) / 20.0) * 100.0))

    # Volatility component: higher vol = higher risk
    # Calibration: 0% vol → 0 risk, 3%+ daily vol → 100 risk
    vol_risk = 50.0
    if latest.volatility_30d is not None:
        vol_risk = max(0.0, min(100.0, (latest.volatility_30d / 3.0) * 100.0))

    return return_risk * 0.6 + vol_risk * 0.4


def _regulatory_risk(db: Session, bank_id: int, lookback_days: int = 90) -> float:
    """Combine SEC filing sentiment + enforcement action recency/severity.

    SEC filing sentiment: 40%, enforcement actions: 60%.
    """
    start_date = date.today() - timedelta(days=lookback_days)

    # SEC filing sentiment
    avg_filing_sentiment = db.query(func.avg(SECFiling.sentiment_score)).filter(
        SECFiling.bank_id == bank_id,
        SECFiling.filed_date >= start_date,
    ).scalar()
    filing_risk = _sentiment_to_risk(avg_filing_sentiment)

    # Enforcement actions: weighted by severity and recency
    actions = (
        db.query(EnforcementAction)
        .filter(
            EnforcementAction.bank_id == bank_id,
            EnforcementAction.action_date >= start_date,
        )
        .all()
    )

    if not actions:
        enforcement_risk = 10.0  # low baseline if no actions
    else:
        # Sum severity scores, weighted by recency
        total_weight = 0.0
        for action in actions:
            days_ago = (date.today() - action.action_date).days
            recency_weight = max(0.1, 1.0 - (days_ago / lookback_days))
            severity = action.severity or 2
            total_weight += severity * recency_weight

        # Calibration: total_weight 0 → 0 risk, 15+ → 100 risk
        enforcement_risk = max(0.0, min(100.0, (total_weight / 15.0) * 100.0))

    return filing_risk * 0.4 + enforcement_risk * 0.6


def _peer_relative_risk(bank_raw_score: float, peer_scores: list[float]) -> float:
    """Compare bank's raw composite to peer average.

    Score > peer avg → higher risk (up to 100).
    Score < peer avg → lower risk (down to 0).
    """
    if not peer_scores:
        return 50.0
    peer_avg = sum(peer_scores) / len(peer_scores)
    if peer_avg == 0:
        return 50.0
    # Deviation as percentage of peer average, mapped to 0-100
    deviation = (bank_raw_score - peer_avg) / peer_avg
    # Map -50% deviation → 0 risk, +50% deviation → 100 risk
    return max(0.0, min(100.0, (deviation + 0.5) * 100.0))


def calculate_composite_score(
    db: Session,
    bank_id: int,
    score_date: date | None = None,
    lookback_days: int = 30,
) -> dict:
    """Calculate composite risk score for a bank using production weights."""
    if score_date is None:
        score_date = date.today()

    start_date = score_date - timedelta(days=lookback_days)

    # Media sentiment component
    media_avg = db.query(func.avg(Signal.sentiment_score)).filter(
        Signal.bank_id == bank_id,
        Signal.source == SignalSource.NEWS,
        Signal.published_at >= start_date,
    ).scalar()
    media_risk = _sentiment_to_risk(media_avg)

    # Complaint component (with narrative sentiment)
    complaint_count = db.query(func.count(CfpbComplaint.id)).filter(
        CfpbComplaint.bank_id == bank_id,
        CfpbComplaint.date_received >= start_date,
    ).scalar() or 0

    narrative_sentiment = db.query(func.avg(CfpbComplaint.sentiment_score)).filter(
        CfpbComplaint.bank_id == bank_id,
        CfpbComplaint.date_received >= start_date,
        CfpbComplaint.sentiment_score.isnot(None),
    ).scalar()

    complaint_risk_val = _complaint_risk(complaint_count, narrative_sentiment)

    # Market component (real Yahoo Finance data)
    market_risk_val = _market_risk(db, bank_id, lookback_days)

    # Regulatory component (SEC + enforcement)
    regulatory_risk_val = _regulatory_risk(db, bank_id, lookback_days * 3)

    # Raw composite (without peer-relative)
    raw_score = (
        PROD_WEIGHTS["media_sentiment"] * media_risk
        + PROD_WEIGHTS["regulatory"] * regulatory_risk_val
        + PROD_WEIGHTS["complaints"] * complaint_risk_val
        + PROD_WEIGHTS["market"] * market_risk_val
    )
    # Renormalize raw to account for missing peer_relative weight
    raw_normalized = raw_score / (1.0 - PROD_WEIGHTS["peer_relative"])

    # Peer-relative component: compare to all other banks
    other_banks = db.query(Bank).filter(Bank.id != bank_id).all()
    peer_scores = []
    for peer in other_banks:
        p_start = score_date - timedelta(days=lookback_days)
        p_media = db.query(func.avg(Signal.sentiment_score)).filter(
            Signal.bank_id == peer.id,
            Signal.source == SignalSource.NEWS,
            Signal.published_at >= p_start,
        ).scalar()
        p_complaints = db.query(func.count(CfpbComplaint.id)).filter(
            CfpbComplaint.bank_id == peer.id,
            CfpbComplaint.date_received >= p_start,
        ).scalar() or 0
        p_raw = (
            _sentiment_to_risk(p_media) * 0.5
            + _complaint_risk(p_complaints) * 0.3
            + 50.0 * 0.2  # simplified peer calc
        )
        peer_scores.append(p_raw)

    peer_risk_val = _peer_relative_risk(raw_normalized, peer_scores)

    # Final composite with all weights
    composite = (
        PROD_WEIGHTS["media_sentiment"] * media_risk
        + PROD_WEIGHTS["regulatory"] * regulatory_risk_val
        + PROD_WEIGHTS["complaints"] * complaint_risk_val
        + PROD_WEIGHTS["market"] * market_risk_val
        + PROD_WEIGHTS["peer_relative"] * peer_risk_val
    )

    return {
        "composite_score": round(composite, 1),
        "media_sentiment_score": round(media_risk, 1),
        "complaint_score": round(complaint_risk_val, 1),
        "market_score": round(market_risk_val, 1),
        "regulatory_score": round(regulatory_risk_val, 1),
        "peer_relative_score": round(peer_risk_val, 1),
        "social_sentiment_score": None,
        "employee_score": None,
    }


def calculate_and_store(db: Session, bank_id: int, score_date: date | None = None) -> RiskScore:
    """Calculate and persist a risk score."""
    if score_date is None:
        score_date = date.today()

    scores = calculate_composite_score(db, bank_id, score_date)

    risk_score = RiskScore(
        bank_id=bank_id,
        score_date=score_date,
        **scores,
    )
    db.add(risk_score)
    db.commit()
    db.refresh(risk_score)
    return risk_score
