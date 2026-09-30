import os
import json
import time
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

try:
    import xgboost as xgb
    USE_XGBOOST = True
except ImportError:
    from sklearn.ensemble import GradientBoostingRegressor
    USE_XGBOOST = False

from app.features.pipeline import FEATURE_COLUMNS

# Explicit disclaimer for synthetic data
DATASET_HEADER_NOTE = "# DEMO / SYNTHETIC TRAIN DATASET - NOT REAL INDIAN RAILWAYS DATA\n"

def generate_synthetic_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic railway dataset with noise and non-linear interactions.
    Clearly labeled as synthetic demo data.
    """
    np.random.seed(seed)

    current_delay = np.random.exponential(scale=20.0, size=n_samples)
    current_delay = np.clip(current_delay, 0, 180)

    speed = np.random.normal(loc=85.0, scale=18.0, size=n_samples)
    speed = np.clip(speed, 20, 130)

    distance_remaining = np.random.uniform(20, 1200, size=n_samples)
    distance_travelled = np.random.uniform(20, 1200, size=n_samples)

    stations_remaining = np.maximum(1, np.round(distance_remaining / np.random.uniform(40, 90, size=n_samples)).astype(int))
    scheduled_remaining = (distance_remaining / 80.0) * 60.0
    elapsed_journey = (distance_travelled / 75.0) * 60.0

    previous_delay = np.maximum(0, current_delay + np.random.normal(loc=-2.0, scale=5.0, size=n_samples))
    dwell_time = np.random.uniform(2.0, 8.0, size=n_samples)
    hour = np.random.randint(0, 24, size=n_samples)
    day = np.random.randint(0, 7, size=n_samples)

    # Calculate additional remaining delay with realistic noise and congestion multipliers
    peak_hour_factor = np.where((hour >= 8) & (hour <= 11) | (hour >= 17) & (hour <= 20), 4.5, 0.5)
    speed_factor = np.where(speed < 50, (50 - speed) * 0.15, 0.0)
    station_dwell_factor = (stations_remaining * dwell_time) * 0.12

    noise = np.random.normal(loc=0.0, scale=3.5, size=n_samples)

    additional_delay = (
        0.10 * current_delay +
        0.25 * np.maximum(0, previous_delay - current_delay) +
        station_dwell_factor +
        speed_factor +
        peak_hour_factor +
        noise
    )

    predicted_remaining_delay = np.maximum(0.0, np.round(additional_delay, 1))

    df = pd.DataFrame({
        'current_delay_minutes': np.round(current_delay, 1),
        'current_speed_kmph': np.round(speed, 1),
        'distance_remaining_km': np.round(distance_remaining, 1),
        'distance_travelled_km': np.round(distance_travelled, 1),
        'stations_remaining': stations_remaining,
        'scheduled_remaining_minutes': np.round(scheduled_remaining, 1),
        'elapsed_journey_minutes': np.round(elapsed_journey, 1),
        'previous_station_delay_minutes': np.round(previous_delay, 1),
        'average_station_dwell_minutes': np.round(dwell_time, 1),
        'hour_of_day': hour,
        'day_of_week': day,
        'predicted_remaining_delay_minutes': predicted_remaining_delay,
    })

    return df

def train_and_evaluate_model():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data')
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    csv_path = os.path.join(data_dir, 'synthetic_train_data.csv')
    print("Generating synthetic demo dataset...")
    df = generate_synthetic_dataset(n_samples=5000, seed=42)
    df.to_csv(csv_path, index=False)
    print(f"Saved synthetic dataset to: {csv_path}")

    X = df[FEATURE_COLUMNS]
    y = df['predicted_remaining_delay_minutes']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print("Training ML model...")
    if USE_XGBOOST:
        print("Using XGBoost Regressor...")
        model = xgb.XGBRegressor(
            n_estimators=150,
            learning_rate=0.05,
            max_depth=5,
            random_state=42,
            n_jobs=-1
        )
        model_type = "XGBoost Regressor"
    else:
        print("Using GradientBoostingRegressor fallback...")
        model = GradientBoostingRegressor(
            n_estimators=120,
            learning_rate=0.05,
            max_depth=4,
            random_state=42
        )
        model_type = "GradientBoostingRegressor (scikit-learn)"

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred = np.maximum(0, y_pred)

    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print("\n==========================================")
    print("MODEL EVALUATION RESULTS (SYNTHETIC DATASET)")
    print("==========================================")
    print(f"Model Type : {model_type}")
    print(f"MAE        : {mae:.3f} minutes")
    print(f"RMSE       : {rmse:.3f} minutes")
    print(f"R² Score   : {r2:.3f}")
    print("Note       : Metrics evaluated on synthetic demo dataset.")
    print("==========================================\n")

    model_path = os.path.join(models_dir, 'eta_model.pkl')
    joblib.dump(model, model_path)
    print(f"Saved trained model artifact to: {model_path}")

    metadata = {
        "model_name": "GATIVERSE Dynamic Prediction Model",
        "model_type": model_type,
        "model_version": "1.0.0-synthetic-demo",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "feature_columns": FEATURE_COLUMNS,
        "metrics": {
            "mae": round(float(mae), 4),
            "rmse": round(float(rmse), 4),
            "r2_score": round(float(r2), 4)
        },
        "dataset_notice": "DEMO / SYNTHETIC DATASET ONLY - NOT FOR REAL INDIAN RAILWAYS PRODUCTION DISPATCH"
    }

    metadata_path = os.path.join(models_dir, 'model_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved model metadata to: {metadata_path}")

if __name__ == '__main__':
    train_and_evaluate_model()
