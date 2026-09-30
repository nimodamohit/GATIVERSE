import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "ok"

def test_predict_eta_valid():
    payload = {
        "trainNumber": "12952",
        "currentDelayMinutes": 35.0,
        "currentSpeedKmph": 82.0,
        "distanceRemainingKm": 740.0,
        "distanceTravelledKm": 520.0,
        "stationsRemaining": 6,
        "scheduledRemainingMinutes": 510.0,
        "elapsedJourneyMinutes": 620.0,
        "previousStationDelayMinutes": 32.0,
        "averageStationDwellMinutes": 4.0,
        "hourOfDay": 15,
        "dayOfWeek": 1,
        "scheduledArrival": "07:15 PM"
    }

    response = client.post("/predict-eta", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "predictedAdditionalDelayMinutes" in data["data"]
    assert "predictedTotalDelayMinutes" in data["data"]
    assert data["data"]["predictedTotalDelayMinutes"] >= payload["currentDelayMinutes"]
    assert "modelVersion" in data["data"]

def test_predict_eta_missing_field():
    payload = {
        "trainNumber": "12952",
        "currentDelayMinutes": 35.0,
    }
    response = client.post("/predict-eta", json=payload)
    assert response.status_code == 422  # Unprocessable Entity / Validation Error

def test_predict_eta_invalid_negative_speed():
    payload = {
        "trainNumber": "12952",
        "currentDelayMinutes": 35.0,
        "currentSpeedKmph": -50.0,  # Invalid
        "distanceRemainingKm": 740.0,
        "distanceTravelledKm": 520.0,
        "stationsRemaining": 6,
        "scheduledRemainingMinutes": 510.0,
        "elapsedJourneyMinutes": 620.0,
        "previousStationDelayMinutes": 32.0,
        "averageStationDwellMinutes": 4.0,
        "hourOfDay": 15,
        "dayOfWeek": 1,
        "scheduledArrival": "07:15 PM"
    }
    response = client.post("/predict-eta", json=payload)
    assert response.status_code == 422
