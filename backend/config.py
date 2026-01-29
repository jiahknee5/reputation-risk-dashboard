from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://repuser:reppass@localhost:5432/reputation_risk"
    newsapi_key: str = ""
    cfpb_base_url: str = "https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/"
    finbert_model: str = "ProsusAI/finbert"
    sec_user_agent: str = "RepRiskDashboard/1.0 (johnny@johnnycchung.com)"
    log_level: str = "INFO"

    # Banks to track
    tracked_banks: list[str] = [
        "US Bancorp",
        "JPMorgan Chase",
        "Wells Fargo",
        "Bank of America",
        "PNC Financial",
        "Truist Financial",
    ]

    bank_tickers: dict[str, str] = {
        "US Bancorp": "USB",
        "JPMorgan Chase": "JPM",
        "Wells Fargo": "WFC",
        "Bank of America": "BAC",
        "PNC Financial": "PNC",
        "Truist Financial": "TFC",
    }

    # SEC CIK numbers for EDGAR lookups
    bank_ciks: dict[str, str] = {
        "US Bancorp": "0000036104",
        "JPMorgan Chase": "0000019617",
        "Wells Fargo": "0000072971",
        "Bank of America": "0000070858",
        "PNC Financial": "0000713676",
        "Truist Financial": "0000092230",
    }

    class Config:
        env_file = ".env"


settings = Settings()
