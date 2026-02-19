from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # Database Configuration - use SQLite for local testing
    database_url: str = "sqlite:///./pizza.db"

    # Application Configuration
    app_name: str = "Pizza Restaurant API"
    app_version: str = "1.0.0"
    debug: bool = True

    # CORS Configuration - parse from string
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
