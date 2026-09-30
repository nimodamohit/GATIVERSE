from fastapi import FastAPI
from app.api.health import router as health_router
from app.api.eta import router as eta_router
from app.config.settings import settings

app = FastAPI(
    title=settings.service_name,
    description="GATIVERSE Machine Learning Service Foundation",
    version="1.0.0"
)

# Include routes
app.include_router(health_router)
app.include_router(eta_router)

@app.get("/")
async def root():
    return {
        "service": settings.service_name,
        "status": "running",
        "docs_url": "/docs"
    }

