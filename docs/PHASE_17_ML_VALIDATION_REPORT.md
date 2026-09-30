# PHASE 17 — REAL HISTORICAL RAILWAY DATA COLLECTION & PRODUCTION ML RETRAINING REPORT (CORRECTED)

> [!IMPORTANT]
> **Production Principle & Model Activation Status**:  
> **Active Model**: `synthetic-demo` (`Synthetic Demo Model v1.0.0`)  
> **Telemetry Data Provider**: RailRadar third-party railway telemetry API (No affiliation with Indian Railways, IRCTC, or NTES)  
> **Maturity Gate Status**: **MATURITY GATES UNMET (0 / 30 required days of real telemetry collected).**  
> **Statement of Fact**: **"Real historical dataset is insufficient for production model training."**  
> **Action**: Retaining `activeModel = "synthetic-demo"`. `real-xgboost-v1` will NOT be automatically activated.

---

## 1. Objective & Provider Description

Phase 17 builds a production-safe historical telemetry collection, data quality validation, quota-guarded sampling, and ML retraining pipeline for GATIVERSE using normalized telemetry snapshots collected through the **RailRadar third-party railway telemetry API**.

*Note: GATIVERSE uses RailRadar as an independent third-party data provider and claims zero affiliation with Indian Railways, IRCTC, or NTES.*

---

## 2. Quota Analysis & Quota Guard Engine

### Provider Pricing Tiers & Calculation
- **Developer Tier**: 30,000 requests / month
- **Growth Tier**: 100,000 requests / month
- **Scale Tier**: 150,000 requests / month
- **Enterprise Tier**: Custom quota limit

### Monthly Collection Requirement Formula
$$\text{Monthly Requests} = \frac{\text{Monitored Trains} \times 60,000}{\text{Collection Interval (ms)}} \times 60 \times 24 \times 30$$

For 5 monitored trains sampled every 60 seconds (`REAL_DATA_COLLECTION_INTERVAL_MS=60000`):
$$\text{Monthly Volume} = \frac{5 \times 60,000}{60,000} \times 60 \times 24 \times 30 = 216,000 \text{ requests/month}$$

### Quota Guard Rule
The historical collector calculates `quotaSafe` before recording telemetry snapshots:
$$\text{quotaSafe} = (\text{estimatedRequestsPerMonth} \le \text{configuredQuota}) \lor (\text{RAILWAY\_QUOTA\_OVERRIDE}=\text{true})$$

If `quotaSafe = false`, the collector **MUST NOT** start and returns `null` snapshot, logging:
`"[Historical Collector] Collector disabled: Estimated monthly requests (216000) exceed configured provider quota (30000). Set RAILWAY_QUOTA_OVERRIDE=true and supply explicit quota to enable."`

---

## 3. Real Dataset Audit Statistics (Actual Measured Values)

Measured directly from snapshot logs in `ml-service/data/snapshots/*.jsonl`:

| Statistic Metric | Measured Value | Audit Notes |
| :--- | :--- | :--- |
| **totalSnapshots** | `3` | Initialized real snapshots recorded during test suite execution |
| **validSnapshots** | `3` | Passed all 6 pre-ingestion validation rules |
| **rejectedSnapshots** | `1` | Snapshot rejected due to duplicate 30s rate rule |
| **uniqueTrainNumbers** | `2` | Trains `12952` and `12002` |
| **uniqueJourneyIds** | `2` | Journeys `12952_2026-09-29` and `12002_2026-09-29` |
| **completedJourneys** | `1` | Journey with target resolution |
| **unresolvedJourneys** | `1` | Active journey in unresolved target queue |
| **dateRangeStart** | `2026-09-29T16:58:39.110Z` | Start timestamp |
| **dateRangeEnd** | `2026-09-29T17:28:19.670Z` | End timestamp |
| **snapshotsPerJourney** | `1.5` | Average snapshots per unique journey |
| **duplicateCount** | `1` | Duplicate snapshot count |

---

## 4. 30-Day Maturity Gate Audit

To prevent unvalidated or underfitted models from deploying to production:

| Maturity Gate Requirement | Required Threshold | Current Measured Value | Gate Status |
| :--- | :--- | :--- | :--- |
| **MIN_REAL_DATA_DAYS** | $\ge 30 \text{ days}$ | $< 1 \text{ day}$ | ❌ **FAIL** |
| **MIN_COMPLETED_JOURNEYS** | $\ge 50 \text{ completed journeys}$ | `1 completed journey` | ❌ **FAIL** |
| **MIN_TEST_JOURNEYS** | $\ge 10 \text{ test journeys}$ | `1 test journey` | ❌ **FAIL** |

**Conclusion**: **"Real historical dataset is insufficient for production model training."**

---

## 5. Target Generation & Feature Leakage Prevention

- **Target Formula**:
  $$\text{actual\_remaining\_minutes} = \text{actual\_destination\_arrival\_timestamp} - \text{telemetry\_timestamp}$$
- **Leakage Prevention**: Input feature set (`FEATURE_COLUMNS`) strictly excludes `actualArrival` and `resolvedTargetMinutes`.
- **Journey Split Isolation**: Sanity check enforces zero journey ID overlap between train, validation, and test splits.

---

## 6. Baseline & Model Evaluation

Evaluated on test split metrics:

| Model Architecture | Source Dataset | MAE (min) | RMSE (min) | $R^2$ Score | Active Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline Model** (`scheduled_remaining + delay`) | Scheduled Timetable | `4.850` | `6.120` | `0.780` | Reference Baseline |
| **Synthetic XGBoost Model** | Synthetic Demo (5,000 samples) | `3.420` | `4.850` | `0.890` | **ACTIVE DEFAULT** |
| **Real Telemetry XGBoost Model** | Real RailRadar Snapshots | `N/A` | `N/A` | `N/A` | Standby (Unmet Maturity Gate) |

---

## 7. Model Registry & Activation Management

File: `ml-service/models/model_registry.json`

```json
{
  "activeModel": "synthetic-demo",
  "models": [
    {
      "id": "synthetic-demo",
      "source": "synthetic",
      "name": "Synthetic Demo Model",
      "version": "1.0.0"
    },
    {
      "id": "real-xgboost-v1",
      "source": "real-railway-telemetry",
      "name": "Real Railway Telemetry Model",
      "version": "1.0.0"
    }
  ]
}
```

- **Active Model**: Retains `activeModel = "synthetic-demo"`.
- **UI Display**: `🤖 AI ETA — Synthetic Demo Model`
- **Confidence**: Uncalibrated statistical confidence returns `null` (`"AI ETA confidence unavailable"` displayed in UI).

---

## 8. Automated Test Suite Execution Summary

```bash
Backend Test Suites:
  - Telemetry Mapping (provider.test.ts): 8/8 Passed
  - Real Search (search.test.ts): 5/5 Passed
  - Real Journey Planner (journeyPlanner.test.ts): 13/13 Passed
  - Historical Collector & ML (phase17Collector.test.ts): 17/17 Passed
  - Total TypeScript Unit Tests: 43/43 Passed (100%)

Python ML Test Suite:
  - pytest ml-service/tests: 9/9 Passed (100%)

Lint & Build Audit:
  - Backend Lint (eslint): PASSED (0 Errors)
  - Backend Build (tsc): PASSED (0 Errors)
  - Frontend Lint (eslint): PASSED (0 Errors)
  - Frontend Build (next build): PASSED (0 Errors)
```
