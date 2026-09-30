# GATIVERSE — Real Live Railway Integration Guide (Phase 11)

## 1. Executive Summary & Verification Statement

Phase 11 for **GATIVERSE** establishes the complete production integration architecture for consuming actual Indian Railways live train tracking data from an authorized data provider.

> **Official Integration Status:**
> **REAL LIVE RAILWAY DATA NOT YET VERIFIED — AUTHORIZED PROVIDER CREDENTIALS REQUIRED**
> The complete provider adapter layer, telemetry validation, freshness tracking, REST status/verification endpoints, Socket.IO streaming, and safe standby fallback are fully built and tested. Real live data tracking will be activated immediately upon adding authorized API credentials to `.env`.

---

## 2. Integration Architecture

```
                 RailwayDataProvider (Interface)
                         |
              ┌──────────┴──────────┐
              ↓                     ↓
      Simulator Provider      Real Provider
  (SimulatorRailwayDataProvider) (RealRailwayDataProvider)
              |                     |
              └──────────┬──────────┘
                         ↓
                 Live Train Service
                         ↓
                  Socket.IO / REST
                         ↓
                 GATIVERSE Frontend
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
          AI ETA              AI Assistant
              ↓                     ↓
              └──────────┬──────────┘
                         ↓
                    User Interface
```

---

## 3. Environment Configuration

Activation is controlled via `backend/.env`:

```env
# Provider Mode Selection ('simulator' | 'real')
RAILWAY_DATA_PROVIDER=real

# Authorized Railway API Activation Settings
RAILWAY_API_ENABLED=true
RAILWAY_API_BASE_URL=https://api.authorized-railway-provider.org/v1
RAILWAY_API_KEY=your_authorized_api_key_here
RAILWAY_API_TIMEOUT_MS=10000

# Rate Limiting & Polling Settings
RAILWAY_POLL_INTERVAL_MS=10000
RAILWAY_CACHE_TTL_MS=5000
```

> **Security Rule:**
> `RAILWAY_API_KEY` is loaded exclusively on the backend server. It is **never** passed to the frontend or exposed in REST response payloads.

---

## 4. Telemetry Normalization & Validation Rules

`RealRailwayDataProvider` converts raw external API payloads into normalized `TrainLiveStatus`:

- **Train Number**: Must be non-empty string (e.g., `"12952"`).
- **Delay Minutes**: Must be non-negative finite number (`0 <= delay <= 1440`).
- **Speed**: Must be finite number (`0 <= speed <= 300` km/h).
- **Coordinates**: Latitude between `-90` and `90`, Longitude between `-180` and `180`.
- **Timestamp Epoch**: Must be positive finite integer.

If telemetry fails validation, it is rejected and logged safely. The system seamlessly engages `SimulatorRailwayDataProvider` standby mode without crashing the server.

---

## 5. Telemetry Freshness & Frontend Display States

- 🟢 **LIVE DATA** (`dataSource === "real"`, `isStale === false`): Displays real-time updates from authorized API (`Updated 12s ago`).
- 🔴 **LIVE DATA — STALE** (`dataSource === "real"`, `isStale === true`): Displays when real data age exceeds 180 seconds (`195s old`).
- 🟡 **DEMO / SIMULATOR DATA** (`dataSource === "simulator"`): Displays when running in simulator mode or fallback standby.

---

## 6. Realtime Socket.IO & ML ETA Pipeline

1. **Polling**: `LiveTrainService` polls every `RAILWAY_POLL_INTERVAL_MS` (10,000ms).
2. **Validation**: `RealRailwayDataProvider` validates raw telemetry.
3. **Socket.IO**: Emits `train:status:update` payload.
4. **ML ETA**: `getETAPredictionService` validates features (speed, delay, stop indices) and executes XGBoost prediction (`modelDataSource: "synthetic-demo"`).
5. **Socket.IO ETA**: Emits `train:eta:update` payload.

---

## 7. Step-by-Step Activation Procedure

1. Obtain official API credentials from an authorized railway data provider.
2. Edit `backend/.env`:
   ```env
   RAILWAY_DATA_PROVIDER=real
   RAILWAY_API_ENABLED=true
   RAILWAY_API_BASE_URL=https://<authorized-api-endpoint>
   RAILWAY_API_KEY=<authorized-api-key>
   ```
3. Start backend (`npm run dev` or `npm start`).
4. Query `GET http://localhost:5000/api/data-provider/verify`. Verify return status is `"verified"`.
5. Query `GET http://localhost:5000/api/live-trains/12952`. Verify `dataSource: "real"`.
6. Open `/train/12952` in browser. Verify header badge shows 🟢 **LIVE DATA**.
