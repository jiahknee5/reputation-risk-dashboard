from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from db.session import get_db
from models.models import Bank, Signal, RiskScore, CfpbComplaint, SignalSource, MarketData, EnforcementAction, SECFiling
from services.risk_engine import calculate_composite_score

router = APIRouter(prefix="/api")


@router.get("/banks")
def list_banks(db: Session = Depends(get_db)):
    banks = db.query(Bank).all()
    return [{"id": b.id, "name": b.name, "ticker": b.ticker} for b in banks]


@router.get("/banks/{bank_id}/risk-score")
def get_risk_score(bank_id: int, db: Session = Depends(get_db)):
    """Get current composite risk score for a bank."""
    scores = calculate_composite_score(db, bank_id)
    bank = db.query(Bank).filter(Bank.id == bank_id).first()
    return {
        "bank": {"id": bank.id, "name": bank.name, "ticker": bank.ticker} if bank else None,
        **scores,
    }


@router.get("/banks/{bank_id}/risk-history")
def get_risk_history(
    bank_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get historical risk scores for trend chart."""
    since = date.today() - timedelta(days=days)
    scores = (
        db.query(RiskScore)
        .filter(RiskScore.bank_id == bank_id, RiskScore.score_date >= since)
        .order_by(RiskScore.score_date)
        .all()
    )
    return [
        {
            "date": s.score_date.isoformat(),
            "composite_score": s.composite_score,
            "media_sentiment_score": s.media_sentiment_score,
            "complaint_score": s.complaint_score,
            "market_score": s.market_score,
        }
        for s in scores
    ]


@router.get("/dashboard/overview")
def dashboard_overview(db: Session = Depends(get_db)):
    """Executive dashboard data: all banks with latest scores and top drivers."""
    banks = db.query(Bank).all()
    results = []
    for bank in banks:
        scores = calculate_composite_score(db, bank.id)

        # Top risk drivers (highest scoring components)
        drivers = sorted(
            [
                ("Media Sentiment", scores["media_sentiment_score"]),
                ("Customer Complaints", scores["complaint_score"]),
                ("Market Signal", scores["market_score"]),
                ("Regulatory", scores["regulatory_score"]),
                ("Peer Relative", scores["peer_relative_score"]),
            ],
            key=lambda x: x[1] if x[1] is not None else 0,
            reverse=True,
        )

        results.append({
            "bank": {"id": bank.id, "name": bank.name, "ticker": bank.ticker},
            **scores,
            "top_drivers": [{"name": d[0], "score": d[1]} for d in drivers[:3]],
        })

    # Sort by composite score descending (highest risk first)
    results.sort(key=lambda x: x["composite_score"], reverse=True)
    return results


@router.get("/signals")
def get_signals(
    bank_id: int | None = None,
    source: SignalSource | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Get recent signals for real-time monitoring feed."""
    q = db.query(Signal).order_by(desc(Signal.published_at))
    if bank_id:
        q = q.filter(Signal.bank_id == bank_id)
    if source:
        q = q.filter(Signal.source == source)
    signals = q.limit(limit).all()

    return [
        {
            "id": s.id,
            "bank_id": s.bank_id,
            "source": s.source.value,
            "title": s.title,
            "content": s.content[:200] if s.content else None,
            "url": s.url,
            "published_at": s.published_at.isoformat() if s.published_at else None,
            "sentiment_score": s.sentiment_score,
            "sentiment_label": s.sentiment_label,
            "is_anomaly": s.is_anomaly,
        }
        for s in signals
    ]


@router.get("/signals/volume")
def signal_volume(
    bank_id: int | None = None,
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Daily signal volume and average sentiment for charts."""
    since = date.today() - timedelta(days=days)
    q = db.query(
        func.date(Signal.published_at).label("day"),
        Signal.source,
        func.count(Signal.id).label("count"),
        func.avg(Signal.sentiment_score).label("avg_sentiment"),
    ).filter(Signal.published_at >= since).group_by("day", Signal.source)

    if bank_id:
        q = q.filter(Signal.bank_id == bank_id)

    rows = q.all()
    return [
        {
            "date": r.day.isoformat() if r.day else None,
            "source": r.source.value,
            "count": r.count,
            "avg_sentiment": round(r.avg_sentiment, 3) if r.avg_sentiment else 0,
        }
        for r in rows
    ]


@router.get("/complaints/summary")
def complaint_summary(
    bank_id: int | None = None,
    days: int = Query(default=90, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """CFPB complaint summary by product and issue."""
    since = date.today() - timedelta(days=days)
    q = db.query(
        CfpbComplaint.product,
        func.count(CfpbComplaint.id).label("count"),
    ).filter(CfpbComplaint.date_received >= since).group_by(CfpbComplaint.product)

    if bank_id:
        q = q.filter(CfpbComplaint.bank_id == bank_id)

    rows = q.order_by(desc("count")).limit(10).all()
    return [{"product": r.product, "count": r.count} for r in rows]


@router.get("/banks/{bank_id}/market-data")
def get_market_data(
    bank_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Get recent market data for a bank."""
    since = date.today() - timedelta(days=days)
    rows = (
        db.query(MarketData)
        .filter(MarketData.bank_id == bank_id, MarketData.date >= since)
        .order_by(MarketData.date)
        .all()
    )
    return [
        {
            "date": r.date.isoformat(),
            "close_price": r.close_price,
            "daily_return_pct": r.daily_return_pct,
            "volume": r.volume,
            "volatility_30d": r.volatility_30d,
        }
        for r in rows
    ]


@router.get("/banks/{bank_id}/enforcement-actions")
def get_enforcement_actions(
    bank_id: int,
    db: Session = Depends(get_db),
):
    """Get enforcement actions for a bank."""
    actions = (
        db.query(EnforcementAction)
        .filter(EnforcementAction.bank_id == bank_id)
        .order_by(desc(EnforcementAction.action_date))
        .all()
    )
    return [
        {
            "action_id": a.action_id,
            "agency": a.agency,
            "action_date": a.action_date.isoformat(),
            "action_type": a.action_type,
            "description": a.description[:500] if a.description else None,
            "penalty_amount": a.penalty_amount,
            "severity": a.severity,
        }
        for a in actions
    ]


@router.get("/banks/{bank_id}/sec-filings")
def get_sec_filings(
    bank_id: int,
    db: Session = Depends(get_db),
):
    """Get SEC filings for a bank."""
    filings = (
        db.query(SECFiling)
        .filter(SECFiling.bank_id == bank_id)
        .order_by(desc(SECFiling.filed_date))
        .limit(50)
        .all()
    )
    return [
        {
            "filing_type": f.filing_type,
            "filed_date": f.filed_date.isoformat(),
            "url": f.url,
            "risk_keywords": f.risk_keywords,
            "sentiment_score": f.sentiment_score,
        }
        for f in filings
    ]


@router.get("/regulatory/timeline")
def regulatory_timeline(
    days: int = Query(default=365, ge=1, le=1095),
    db: Session = Depends(get_db),
):
    """Cross-bank enforcement action timeline."""
    since = date.today() - timedelta(days=days)
    actions = (
        db.query(EnforcementAction, Bank)
        .join(Bank, EnforcementAction.bank_id == Bank.id)
        .filter(EnforcementAction.action_date >= since)
        .order_by(desc(EnforcementAction.action_date))
        .all()
    )
    return [
        {
            "bank": {"id": bank.id, "name": bank.name, "ticker": bank.ticker},
            "action_id": action.action_id,
            "agency": action.agency,
            "action_date": action.action_date.isoformat(),
            "action_type": action.action_type,
            "description": action.description[:300] if action.description else None,
            "penalty_amount": action.penalty_amount,
            "severity": action.severity,
        }
        for action, bank in actions
    ]
