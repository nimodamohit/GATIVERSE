from pydantic import BaseModel, Field, field_validator
from typing import Optional

class ETAPredictionRequest(BaseModel):
    trainNumber: str = Field(..., description="Train number identifier (e.g. 12952)")
    currentDelayMinutes: float = Field(..., ge=0, description="Current delay in minutes")
    currentSpeedKmph: float = Field(..., ge=0, le=250, description="Current train speed in km/h")
    distanceRemainingKm: float = Field(..., ge=0, description="Remaining distance in km")
    distanceTravelledKm: float = Field(..., ge=0, description="Distance travelled so far in km")
    stationsRemaining: int = Field(..., ge=0, description="Number of upcoming station stops")
    scheduledRemainingMinutes: float = Field(..., ge=0, description="Scheduled remaining journey time in minutes")
    elapsedJourneyMinutes: float = Field(..., ge=0, description="Elapsed journey time in minutes")
    previousStationDelayMinutes: float = Field(..., ge=0, description="Delay recorded at previous stop in minutes")
    averageStationDwellMinutes: float = Field(default=3.0, ge=0, le=60, description="Average dwell time per stop in minutes")
    hourOfDay: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    dayOfWeek: int = Field(..., ge=0, le=6, description="Day of the week (0=Monday, 6=Sunday)")
    scheduledArrival: str = Field(..., description="ISO datetime string or time string for scheduled arrival")

    @field_validator('currentDelayMinutes', 'currentSpeedKmph', 'distanceRemainingKm', 'distanceTravelledKm', 'scheduledRemainingMinutes', 'elapsedJourneyMinutes', 'previousStationDelayMinutes')
    def check_non_negative_finite(cls, v: float, info) -> float:
        import math
        if math.isnan(v) or math.isinf(v):
            raise ValueError(f"Field {info.field_name} must be a valid finite number")
        return v

class ETAPredictionData(BaseModel):
    trainNumber: str
    predictedAdditionalDelayMinutes: float
    predictedTotalDelayMinutes: float
    predictedArrival: str
    modelVersion: str
    predictionGeneratedAt: str
    disclaimer: str = "DEMO / SYNTHETIC MODEL PREDICTION - NOT FOR PRODUCTION RAILWAY DISPATCH"

class ETAPredictionResponse(BaseModel):
    success: bool
    data: ETAPredictionData
