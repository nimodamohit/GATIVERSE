# GATIVERSE — Real Live Train Map & Production ETA Pipeline Guide (Phase 13)

## 1. Overview & Verified Live Status

GATIVERSE operates with verified real-time Indian Railways telemetry provided by RailRadar (`GET /v1/trains/{number}/live`).

> **Official Live Verification Status:**
> - **Provider**: `real` (RailRadar API)
> - **Mode**: `live` (`dataSource = "real"`, `isStale = false`)
> - **Telemetry Verified**: 100% Authentic Station Names, Delay Minutes, Progress, and 221 Route Stops.

---

## 2. Real GPS & Live Map Position Architecture

```
                       RailRadar API
                             │
                             ▼
                    RailwayApiClient
                             │
                             ▼
                  RealRailwayDataProvider
                             │ (Resolves lat/lng from currentLocation or route geometry)
                             ▼
                     Live Train Service
                             │
                             ▼
                     Socket.IO Stream
                             │
                             ▼
                   TrainDetailsClient
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Coordinates Present             Coordinates Null
  (Draw GPS Train Marker)      (Display "Live GPS position unavailable")
```

### Map Position Rules:
1. **Direct GPS Coordinates**: If `currentLocation.lat` and `currentLocation.lng` are provided by the telemetry relay, they are plotted directly on the map interface.
2. **Station Geometry Lookup**: If station code is present, coordinates are derived from authentic station coordinates database (`KNOWN_STATION_COORDINATES`).
3. **No Fake Position Policy**: If coordinates cannot be legitimately derived, `latitude` and `longitude` are set to `null`. The UI displays **"Live GPS position unavailable"** instead of placing a fake moving map marker.

---

## 3. Production ETA Pipeline & Data Source Transparency

GATIVERSE cleanly separates live telemetry metrics from machine learning predictions:

| Metric | Source | Display Label |
| :--- | :--- | :--- |
| **Scheduled Arrival** | Official Timetable | `Scheduled Arrival: 08:35 AM` |
| **Expected Arrival** | Real Telemetry + Delay | `Expected Arrival: 09:02 AM` |
| **Current Delay** | Live Telemetry Relay | `Delay: +27 min` |
| **AI ML ETA** | XGBoost Feature Model | `🤖 AI ETA (Model: Synthetic-demo model)` |

### ML Data Source Transparency:
- The ML prediction carries metadata `modelDataSource: "synthetic-demo"`.
- The user interface clearly labels AI ETA predictions as synthetic-demo model output, ensuring passengers never confuse machine learning estimations with official railway telemetry.

---

## 4. Historical Telemetry Training Schema (`TelemetryTrainingSchema.ts`)

To prepare the ETA pipeline for future retraining on authentic Indian Railways historical datasets, GATIVERSE defines a normalized schema in [`backend/src/models/TelemetryTrainingSchema.ts`](file:///c:/Users/LENOVO/OneDrive/Documents/Desktop/Rail_ETA/backend/src/models/TelemetryTrainingSchema.ts):

```typescript
export interface TelemetryTrainingRecord {
  trainNumber: string;
  journeyDate: string; // YYYY-MM-DD
  stationSequence: number;
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  delayArrival?: number | null;
  delayDeparture?: number | null;
  distance?: number | null;
  currentDelay: number;
  segmentProgress?: number | null;
  timestamp: string; // ISO 8601
  speed?: number | null;
  weather?: string | null;
  dayOfWeek: number; // 0-6
  hour: number; // 0-23
  targetDelayAtDestination?: number | null;
}
```

---

## 5. API Quota Protection & Caching Rules

- **In-Memory Cache TTL (`RAILWAY_CACHE_TTL_MS`)**: 5,000 ms default cache window. Identical status requests within TTL reuse fresh raw responses.
- **Polling Interval (`RAILWAY_POLL_INTERVAL_MS`)**: 10,000 ms default polling interval.
- **Quota Safeguard**: Prevents API key quota exhaustion under RailRadar's free tier limits.
