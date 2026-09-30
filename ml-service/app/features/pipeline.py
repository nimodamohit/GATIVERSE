import pandas as pd
import numpy as np
from typing import List, Dict, Any

FEATURE_COLUMNS: List[str] = [
    'current_delay_minutes',
    'current_speed_kmph',
    'distance_remaining_km',
    'distance_travelled_km',
    'stations_remaining',
    'scheduled_remaining_minutes',
    'elapsed_journey_minutes',
    'previous_station_delay_minutes',
    'average_station_dwell_minutes',
    'hour_of_day',
    'day_of_week',
]

def extract_feature_dict(request_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts and normalizes features from an incoming request dictionary.
    """
    return {
        'current_delay_minutes': float(request_data.get('currentDelayMinutes', 0.0)),
        'current_speed_kmph': float(request_data.get('currentSpeedKmph', 0.0)),
        'distance_remaining_km': float(request_data.get('distanceRemainingKm', 0.0)),
        'distance_travelled_km': float(request_data.get('distanceTravelledKm', 0.0)),
        'stations_remaining': float(request_data.get('stationsRemaining', 0)),
        'scheduled_remaining_minutes': float(request_data.get('scheduledRemainingMinutes', 0.0)),
        'elapsed_journey_minutes': float(request_data.get('elapsedJourneyMinutes', 0.0)),
        'previous_station_delay_minutes': float(request_data.get('previousStationDelayMinutes', 0.0)),
        'average_station_dwell_minutes': float(request_data.get('averageStationDwellMinutes', 3.0)),
        'hour_of_day': float(request_data.get('hourOfDay', 12)),
        'day_of_week': float(request_data.get('dayOfWeek', 0)),
    }

def prepare_feature_dataframe(feature_dicts: List[Dict[str, float]]) -> pd.DataFrame:
    """
    Converts list of feature dictionaries into an ordered pandas DataFrame ready for inference/training.
    """
    df = pd.DataFrame(feature_dicts)
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0
    return df[FEATURE_COLUMNS]
