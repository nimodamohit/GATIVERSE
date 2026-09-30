import os
from pydantic import BaseModel

class Settings(BaseModel):
    service_name: str = "GATIVERSE ML Service"
    env: str = os.getenv("NODE_ENV", "development")
    port: int = int(os.getenv("PORT", "8000"))

settings = Settings()
