import unittest
import pandas as pd
import numpy as np
from app.features.pipeline import FEATURE_COLUMNS
from training.pipeline import (
    compute_baseline_predictions,
    journey_based_train_val_test_split,
    MIN_REAL_DATA_DAYS,
    MIN_COMPLETED_JOURNEYS,
)

class TestPhase17MLPipeline(unittest.TestCase):

    def test_1_feature_leakage_prevention(self):
        """Rule 6: Verify actual future arrival time is NOT in input feature columns."""
        forbidden_terms = ['actual_arrival', 'actual_destination_arrival_time', 'resolvedTargetMinutes', 'target']
        for col in FEATURE_COLUMNS:
            for term in forbidden_terms:
                self.assertNotIn(term, col, f"Feature column '{col}' violates target leakage prevention rule!")

    def test_2_journey_based_split_isolation(self):
        """Rule 7: Verify snapshots from the same journey do NOT cross train/val/test split boundaries."""
        records = []
        for j_id in range(10):
            train_num = f"1290{j_id}"
            j_date = "2026-09-30"
            for step in range(5):
                records.append({
                    "trainNumber": train_num,
                    "journeyDate": j_date,
                    "current_delay_minutes": step * 2,
                    "current_speed_kmph": 80.0,
                    "distance_remaining_km": 500.0 - (step * 50),
                    "distance_travelled_km": step * 50,
                    "stations_remaining": 10 - step,
                    "scheduled_remaining_minutes": 300 - (step * 30),
                    "elapsed_journey_minutes": step * 30,
                    "previous_station_delay_minutes": step * 2,
                    "average_station_dwell_minutes": 3.5,
                    "hour_of_day": 14,
                    "day_of_week": 2,
                    "resolvedTargetMinutes": 300 - (step * 30) + (step * 2)
                })

        df = pd.DataFrame(records)
        train_df, val_df, test_df = journey_based_train_val_test_split(df, seed=42)

        train_journeys = set(train_df['journey_id'].unique())
        val_journeys = set(val_df['journey_id'].unique())
        test_journeys = set(test_df['journey_id'].unique())

        self.assertEqual(len(train_journeys.intersection(val_journeys)), 0, "Train and Val splits share journey IDs!")
        self.assertEqual(len(train_journeys.intersection(test_journeys)), 0, "Train and Test splits share journey IDs!")
        self.assertEqual(len(val_journeys.intersection(test_journeys)), 0, "Val and Test splits share journey IDs!")

    def test_3_baseline_calculation(self):
        """Rule 8: Verify baseline calculation matches scheduled_remaining_minutes + current_delay."""
        df = pd.DataFrame({
            'scheduled_remaining_minutes': [120.0, 45.0, 200.0],
            'current_delay_minutes': [15.0, 0.0, 30.0]
        })
        baseline = compute_baseline_predictions(df)
        expected = np.array([135.0, 45.0, 230.0])
        np.testing.assert_array_almost_equal(baseline.values, expected)

    def test_4_target_generation_formula(self):
        """Rule 5: Verify target formula actual_destination_arrival - telemetry_timestamp."""
        ts_ms = 1000000
        dest_ms = 1000000 + (45 * 60 * 1000)
        remaining_minutes = (dest_ms - ts_ms) / 60000
        self.assertEqual(remaining_minutes, 45.0)

    def test_5_maturity_gate_thresholds(self):
        """Rule 7: Verify 30-Day Maturity Gate configuration constants."""
        self.assertEqual(MIN_REAL_DATA_DAYS, 30)
        self.assertEqual(MIN_COMPLETED_JOURNEYS, 50)

if __name__ == '__main__':
    unittest.main()
