"""FinBERT sentiment analysis pipeline.

Uses ProsusAI/finbert for financial text sentiment classification.
Returns sentiment score (-1 to 1) and label (positive/negative/neutral).
"""

import logging
from functools import lru_cache

from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

from config import settings

logger = logging.getLogger(__name__)

_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        logger.info("Loading FinBERT model: %s", settings.finbert_model)
        _pipeline = pipeline(
            "sentiment-analysis",
            model=settings.finbert_model,
            tokenizer=settings.finbert_model,
            truncation=True,
            max_length=512,
        )
        logger.info("FinBERT model loaded")
    return _pipeline


# Label mapping to numeric scores
LABEL_SCORES = {
    "positive": 1.0,
    "negative": -1.0,
    "neutral": 0.0,
}


def analyze_sentiment(text: str) -> dict:
    """Analyze sentiment of a single text.

    Returns:
        {"score": float (-1 to 1), "label": str, "confidence": float}
    """
    if not text or not text.strip():
        return {"score": 0.0, "label": "neutral", "confidence": 0.0}

    try:
        pipe = _get_pipeline()
        result = pipe(text[:512])[0]
        label = result["label"].lower()
        confidence = result["score"]
        score = LABEL_SCORES.get(label, 0.0) * confidence
        return {"score": score, "label": label, "confidence": confidence}
    except Exception as e:
        logger.error("Sentiment analysis failed: %s", e)
        return {"score": 0.0, "label": "neutral", "confidence": 0.0}


def analyze_batch(texts: list[str], batch_size: int = 32) -> list[dict]:
    """Analyze sentiment for a batch of texts."""
    if not texts:
        return []

    pipe = _get_pipeline()
    results = []
    for i in range(0, len(texts), batch_size):
        batch = [t[:512] if t else "" for t in texts[i:i + batch_size]]
        try:
            raw = pipe(batch)
            for r in raw:
                label = r["label"].lower()
                confidence = r["score"]
                score = LABEL_SCORES.get(label, 0.0) * confidence
                results.append({"score": score, "label": label, "confidence": confidence})
        except Exception as e:
            logger.error("Batch sentiment failed: %s", e)
            results.extend([{"score": 0.0, "label": "neutral", "confidence": 0.0}] * len(batch))

    return results
