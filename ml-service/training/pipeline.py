import os
import json
import glob
import hashlib
import numpy as np
import pandas as pd
from datetime import datetime

try:
    from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
except ImportError:
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    def root_mean_squared_error(y_true, y_pred):
        return np.sqrt(mean_squared_error(y_true, y_pred))

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    from sklearn.ensemble import GradientBoostingRegressor
    HAS_XGBOOST = False

FEATURE_COLUMNS = [
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

MIN_REAL_DATA_DAYS = 30
MIN_COMPLETED_JOURNEYS = 50
MIN_TEST_JOURNEYS = 10

def load_and_validate_telemetry(snapshot_dir: str):
    """
    Loads raw historical telemetry snapshots, applies data quality rules,
    and returns a clean DataFrame and a rejection audit log.
    """
    records = []
    rejections = []

    pattern = os.path.join(snapshot_dir, "*.jsonl")
    files = glob.glob(pattern)

    for fpath in files:
        with open(fpath, 'r', encoding='utf-8') as f:
            for line_idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except Exception as e:
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": f"Malformed JSON: {str(e)}"})
                    continue

                train_no = data.get('trainNumber')
                if not train_no or str(train_no).strip() == '':
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": "Missing train number"})
                    continue

                journey_date = data.get('journeyDate')
                if not journey_date:
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": "Missing journey date"})
                    continue

                lat = data.get('latitude')
                if lat is not None and (lat < -90 or lat > 90):
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": f"Invalid latitude: {lat}"})
                    continue

                lng = data.get('longitude')
                if lng is not None and (lng < -180 or lng > 180):
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": f"Invalid longitude: {lng}"})
                    continue

                speed = data.get('speedKmh')
                if speed is not None and (speed < 0 or speed > 300):
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": f"Invalid speed: {speed}"})
                    continue

                delay = data.get('delayMinutes', 0)
                if delay < -60 or delay > 1440:
                    rejections.append({"file": os.path.basename(fpath), "line": line_idx, "reason": f"Delay out of bounds: {delay}"})
                    continue

                records.append(data)

    df = pd.DataFrame(records)
    return df, rejections


def compute_baseline_predictions(df: pd.DataFrame) -> np.ndarray:
    """
    Baseline prediction formula: scheduled_remaining_minutes + current_delay_minutes
    """
    return df['scheduled_remaining_minutes'] + df['current_delay_minutes']


def journey_based_train_val_test_split(df: pd.DataFrame, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=42):
    """
    Splits dataset into train, val, test splits based on unique journey IDs (trainNumber + journeyDate)
    to strictly prevent target leakage across split boundaries.
    """
    df['journey_id'] = df['trainNumber'].astype(str) + "_" + df['journeyDate'].astype(str)
    unique_journeys = df['journey_id'].unique()

    np.random.seed(seed)
    shuffled_journeys = np.random.permutation(unique_journeys)

    n_total = len(shuffled_journeys)
    n_train = int(n_total * train_ratio)
    n_val = int(n_total * val_ratio)

    train_journeys = set(shuffled_journeys[:n_train])
    val_journeys = set(shuffled_journeys[n_train:n_train + n_val])
    test_journeys = set(shuffled_journeys[n_train + n_val:])

    # LEAKAGE SANITY CHECK
    if train_journeys.intersection(val_journeys) or train_journeys.intersection(test_journeys) or val_journeys.intersection(test_journeys):
        raise ValueError("CRITICAL FAILURE: Target leakage detected! Journey IDs overlap across dataset splits.")

    train_df = df[df['journey_id'].isin(train_journeys)].copy()
    val_df = df[df['journey_id'].isin(val_journeys)].copy()
    test_df = df[df['journey_id'].isin(test_journeys)].copy()

    return train_df, val_df, test_df


def compute_dataset_hash(df: pd.DataFrame) -> str:
    content = "".join(df['journey_id'].sort_values().astype(str)) + str(len(df))
    return hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]


def train_and_evaluate_real_model(snapshot_dir: str, models_dir: str):
    """
    Executes the Phase 17 Correction ML workflow and checks 30-Day Maturity Gates.
    """
    print("====================================================")
    print("GATIVERSE — Phase 17 Real Telemetry ML Pipeline")
    print("====================================================\n")

    df_raw, rejections = load_and_validate_telemetry(snapshot_dir)
    print(f"Total raw snapshots processed : {len(df_raw)}")
    print(f"Total snapshots rejected     : {len(rejections)}")

    if len(df_raw) == 0:
        print("\n⚠️ NOTICE: Real historical dataset is insufficient for production model training.")
        print("Required: Verified historical journeys with resolved arrival targets.")
        print("Action  : Retaining active model = 'synthetic-demo' until telemetry accumulator matures.\n")
        return {
            "status": "insufficient_data",
            "message": "Real historical dataset is insufficient for production model training.",
            "raw_count": 0,
            "rejection_count": len(rejections),
            "maturityGatesPassed": False,
        }

    # Filter resolved target records
    df_clean = df_raw.dropna(subset=['resolvedTargetMinutes']).copy() if 'resolvedTargetMinutes' in df_raw.columns else pd.DataFrame()
    unique_journeys_count = df_clean['journey_id'].nunique() if 'journey_id' in df_clean.columns else 0

    # Calculate date range span
    if 'timestamp' in df_raw.columns and not df_raw.empty:
        timestamps = pd.to_datetime(df_raw['timestamp'])
        days_span = (timestamps.max() - timestamps.min()).days + 1
    else:
        days_span = 0

    print(f"Days span in raw telemetry  : {days_span} days (Min required: {MIN_REAL_DATA_DAYS})")
    print(f"Completed journeys resolved : {unique_journeys_count} (Min required: {MIN_COMPLETED_JOURNEYS})")

    # MATURITY GATE CHECK
    maturity_passed = (days_span >= MIN_REAL_DATA_DAYS) and (unique_journeys_count >= MIN_COMPLETED_JOURNEYS)

    if not maturity_passed:
        print("\n⚠️ NOTICE: Real historical dataset is insufficient for production model training.")
        print(f"Reason  : Maturity Gate not satisfied. (Days: {days_span}/{MIN_REAL_DATA_DAYS}, Journeys: {unique_journeys_count}/{MIN_COMPLETED_JOURNEYS})")
        print("Action  : Retaining active model = 'synthetic-demo'. Real model will NOT be activated.\n")
        return {
            "status": "insufficient_data",
            "message": "Real historical dataset is insufficient for production model training.",
            "daysSpan": days_span,
            "completedJourneys": unique_journeys_count,
            "maturityGatesPassed": False,
        }

    # If maturity gate passed, train model
    train_df, val_df, test_df = journey_based_train_val_test_split(df_clean)

    X_train, y_train = train_df[FEATURE_COLUMNS], train_df['resolvedTargetMinutes']
    X_val, y_val = val_df[FEATURE_COLUMNS], val_df['resolvedTargetMinutes']
    X_test, y_test = test_df[FEATURE_COLUMNS], test_df['resolvedTargetMinutes']

    # 1. Baseline Evaluation
    baseline_pred = compute_baseline_predictions(test_df)
    b_mae = mean_absolute_error(y_test, baseline_pred)
    b_rmse = root_mean_squared_error(y_test, baseline_pred)
    b_r2 = r2_score(y_test, baseline_pred)

    # 2. Train Real XGBoost Model
    if HAS_XGBOOST:
        model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.05, max_depth=5, random_state=42)
    else:
        model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.05, max_depth=4, random_state=42)

    model.fit(X_train, y_train)
    y_test_pred = model.predict(X_test)

    m_mae = mean_absolute_error(y_test, y_test_pred)
    m_rmse = root_mean_squared_error(y_test, y_test_pred)
    m_r2 = r2_score(y_test, y_test_pred)

    ds_hash = compute_dataset_hash(df_clean)
    meta = {
        "model_id": "real-xgboost-v1",
        "source": "real-railway-telemetry",
        "datasetHash": ds_hash,
        "datasetSize": len(df_clean),
        "uniqueJourneyCount": unique_journeys_count,
        "trainingJourneyCount": train_df['journey_id'].nunique(),
        "validationJourneyCount": val_df['journey_id'].nunique(),
        "testJourneyCount": test_df['journey_id'].nunique(),
        "featureList": FEATURE_COLUMNS,
        "targetDefinition": "actual_destination_arrival_time - telemetry_timestamp",
        "trainingTimestamp": datetime.utcnow().isoformat() + "Z",
        "testMetrics": {"mae": round(float(m_mae), 3), "rmse": round(float(m_rmse), 3), "r2": round(float(m_r2), 3)},
        "baselineMetrics": {"mae": round(float(b_mae), 3), "rmse": round(float(b_rmse), 3), "r2": round(float(b_r2), 3)},
        "maturityGatesPassed": True,
    }

    with open(os.path.join(models_dir, 'real_model_metadata.json'), 'w') as f:
        json.dump(meta, f, indent=2)

    return {
        "status": "success",
        "testMAE": m_mae,
        "testRMSE": m_rmse,
        "testR2": m_r2,
        "baselineMAE": b_mae,
        "maturityGatesPassed": True,
    }


if __name__ == '__main__':
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    snapshot_dir = os.path.join(base_dir, 'data', 'snapshots')
    models_dir = os.path.join(base_dir, 'models')
    train_and_evaluate_real_model(snapshot_dir, models_dir)
