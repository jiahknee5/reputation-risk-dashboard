import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Text, Enum, ForeignKey, Date, Boolean,
    JSON,
)
from sqlalchemy.orm import relationship

from models.base import Base, TimestampMixin


class SignalSource(str, enum.Enum):
    NEWS = "news"
    SOCIAL = "social"
    CFPB = "cfpb"
    REGULATORY = "regulatory"
    MARKET = "market"
    EMPLOYEE = "employee"


class Bank(Base, TimestampMixin):
    __tablename__ = "banks"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), unique=True, nullable=False)
    ticker = Column(String(10), nullable=False)
    display_name = Column(String(200))
    cik = Column(String(20))  # SEC CIK number for EDGAR lookups

    signals = relationship("Signal", back_populates="bank")
    risk_scores = relationship("RiskScore", back_populates="bank")
    complaints = relationship("CfpbComplaint", back_populates="bank")
    market_data = relationship("MarketData", back_populates="bank")
    enforcement_actions = relationship("EnforcementAction", back_populates="bank")
    sec_filings = relationship("SECFiling", back_populates="bank")


class Signal(Base, TimestampMixin):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    source = Column(Enum(SignalSource), nullable=False)
    title = Column(String(500))
    content = Column(Text)
    url = Column(String(1000))
    published_at = Column(DateTime(timezone=True))
    sentiment_score = Column(Float)  # -1 to 1
    sentiment_label = Column(String(20))  # positive, negative, neutral
    is_anomaly = Column(Boolean, default=False)

    bank = relationship("Bank", back_populates="signals")


class RiskScore(Base, TimestampMixin):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    score_date = Column(Date, nullable=False)
    composite_score = Column(Float, nullable=False)  # 0-100
    media_sentiment_score = Column(Float)
    social_sentiment_score = Column(Float)
    regulatory_score = Column(Float)
    complaint_score = Column(Float)
    employee_score = Column(Float)
    market_score = Column(Float)
    peer_relative_score = Column(Float)

    bank = relationship("Bank", back_populates="risk_scores")


class CfpbComplaint(Base, TimestampMixin):
    __tablename__ = "cfpb_complaints"

    id = Column(Integer, primary_key=True)
    complaint_id = Column(String(50), unique=True, nullable=False)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    date_received = Column(Date, nullable=False)
    product = Column(String(200))
    sub_product = Column(String(200))
    issue = Column(String(500))
    sub_issue = Column(String(500))
    narrative = Column(Text)
    company_response = Column(String(200))
    timely_response = Column(Boolean)
    consumer_disputed = Column(Boolean)
    sentiment_score = Column(Float)

    bank = relationship("Bank", back_populates="complaints")


class MarketData(Base, TimestampMixin):
    __tablename__ = "market_data"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    date = Column(Date, nullable=False)
    close_price = Column(Float)
    daily_return_pct = Column(Float)
    volume = Column(Integer)
    volatility_30d = Column(Float)

    bank = relationship("Bank", back_populates="market_data")


class EnforcementAction(Base, TimestampMixin):
    __tablename__ = "enforcement_actions"

    id = Column(Integer, primary_key=True)
    action_id = Column(String(100), unique=True, nullable=False)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    agency = Column(String(50))  # OCC, FDIC, Fed
    action_date = Column(Date, nullable=False)
    action_type = Column(String(200))
    description = Column(Text)
    penalty_amount = Column(Float)
    severity = Column(Integer)  # 1-5

    bank = relationship("Bank", back_populates="enforcement_actions")


class SECFiling(Base, TimestampMixin):
    __tablename__ = "sec_filings"

    id = Column(Integer, primary_key=True)
    bank_id = Column(Integer, ForeignKey("banks.id"), nullable=False)
    cik = Column(String(20))
    filing_type = Column(String(20))  # 10-K, 10-Q, 8-K
    filed_date = Column(Date, nullable=False)
    url = Column(String(1000))
    risk_keywords = Column(JSON, default=list)
    sentiment_score = Column(Float)

    bank = relationship("Bank", back_populates="sec_filings")
