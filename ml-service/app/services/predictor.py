import os
import json
import joblib
from typing import Dict, Any
from datetime import datetime, timedelta
from app.features.pipeline import extract_feature_dict, prepare_feature_dataframe
from app.schemas.eta import ETAPredictionRequest, ETAPredictionData

class ETAPredictorService:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.model_version = "1.0.0-synthetic-demo"
        self.load_model()

    def load_model(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_path = os.path.join(base_dir, 'models', 'eta_model.pkl')
        metadata_path = os.path.join(base_dir, 'models', 'model_metadata.json')

        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"[ETA Predictor] Loaded model artifact from {model_path}")
            except Exception as e:
                print(f"[ETA Predictor] Error loading model artifact: {e}")
                self.model = None

        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
                    self.model_version = self.metadata.get('model_version', self.model_version)
            except Exception as e:
                print(f"[ETA Predictor] Error loading metadata: {e}")

    def predict(self, req: ETAPredictionRequest) -> ETAPredictionData:
        req_dict = req.model_dump()
        feature_dict = extract_feature_dict(req_dict)
        df_features = prepare_feature_dataframe([feature_dict])

        if self.model is not None:
            raw_prediction = float(self.model.predict(df_features)[0])
            predicted_add_delay = max(0.0, round(raw_prediction, 1))
        else:
            # Fallback heuristic prediction if model file missing
            predicted_add_delay = round(max(0.0, (req.stationsRemaining * 2.5) + (req.currentDelayMinutes * 0.1)), 1)

        predicted_total_delay = round(req.currentDelayMinutes + predicted_add_delay, 1)

        # Parse scheduled arrival ISO or time string to compute predicted arrival
        predicted_arrival_str = req.scheduledArrival
        try:
            if "T" in req.scheduledArrival:
                dt_sched = datetime.fromisoformat(req.scheduledArrival.replace("Z", "+00:00"))
                dt_pred = dt_sched + timedelta(minutes=predicted_total_delay)
                predicted_arrival_str = dt_pred.isoformat()
            else:
                # Time string format like "07:15 PM" or "19:15"
                predicted_arrival_str = f"{req.scheduledArrival} (+{int(predicted_total_delay)} min ETA)"
        except Exception:
            predicted_arrival_str = f"{req.scheduledArrival} (+{int(predicted_total_delay)} min ETA)"

        return ETAPredictionData(
            trainNumber=req.trainNumber,
            predictedAdditionalDelayMinutes=predicted_add_delay,
            predictedTotalDelayMinutes=predicted_total_delay,
            predictedArrival=predicted_arrival_str,
            modelVersion=self.model_version,
            predictionGeneratedAt=datetime.utcnow().isoformat() + "Z"
        )

# Global singleton predictor instance
eta_predictor = ETAPredictorService()
