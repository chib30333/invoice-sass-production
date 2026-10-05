from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./invoice_studio.db"
    secret_key: str = "change-me-in-production"
    access_token_minutes: int = 60 * 24 * 14
    cors_origins: str = "http://localhost:3000"
    reset_token_minutes: int = 30
    # The PDF ships with Selawik (metric-compatible with Segoe UI). With a Segoe UI licence,
    # point these at segoeui.ttf / segoeuib.ttf.
    pdf_font_regular: str = ""
    pdf_font_bold: str = ""


settings = Settings()
