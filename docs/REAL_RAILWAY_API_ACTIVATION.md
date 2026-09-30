# GATIVERSE — Real Railway API Activation Guide (Phase 10)

## 1. Overview & System Architecture

GATIVERSE implements a robust, modular provider architecture designed to consume live telemetry from an authorized Indian Railways API provider while isolating application services (Socket.IO, XGBoost ML ETA, Journey Planner, and AI Assistant) from raw external API schemas.

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

## 2. Environment Variables Configuration

Real provider activation is governed strictly by environment variables in `backend/.env`.

```env
# Provider Mode Selection: 'simulator' | 'real'
RAILWAY_DATA_PROVIDER=real

# Authorized Railway API Activation Controls
RAILWAY_API_ENABLED=true
RAILWAY_API_BASE_URL=https://api.authorized-railway-provider.org/v1
RAILWAY_API_KEY=your_production_api_key_here
RAILWAY_API_TIMEOUT_MS=10000

# Rate Limiting & Polling Controls
RAILWAY_POLL_INTERVAL_MS=10000
RAILWAY_CACHE_TTL_MS=5000
```

> **Security Rule:**
> `RAILWAY_API_KEY` is loaded exclusively on the backend. It is **never** passed to the frontend or rendered in REST status endpoints.

---

## 3. Telemetry Normalization & Validation Rules

`RealRailwayDataProvider` strictly validates raw external JSON responses before adapting them into `TrainLiveStatus`:

- **Train Number**: Must be non-empty string.
- **Delay Minutes**: Must be non-negative finite number (`0 <= delay <= 1440`).
- **Speed**: Must be finite number (`0 <= speed <= 300` km/h).
- **Coordinates**: Latitude must be between `-90` and `90`. Longitude must be between `-180` and `180`.
- **Timestamp Epoch**: Must be a positive finite integer representing telemetry generation time.

If any field fails validation, the raw payload is rejected, logged cleanly, and the provider seamlessly engages simulator standby mode without crashing the backend.

---

## 4. Telemetry Freshness & Frontend Indicators

Telemetry freshness is determined via `dataAgeSeconds`:

- 🟢 **LIVE DATA** (`dataSource === "real"`, `isStale === false`): Rendered when fresh live data (<180s old) is active.
- 🔴 **LIVE DATA — STALE** (`dataSource === "real"`, `isStale === true`): Rendered when real data age exceeds 180 seconds.
- 🟡 **DEMO / SIMULATOR DATA** (`dataSource === "simulator"`): Rendered when operating in simulator mode or fallback standby.

---

## 5. Non-Blocking Standby Fallback Strategy

When `RAILWAY_DATA_PROVIDER=real` and `RAILWAY_API_ENABLED=true`:
1. `RealRailwayDataProvider` issues HTTP requests via `RailwayApiClient`.
2. If API credentials are missing, API times out (>10,000ms), returns HTTP errors (401, 403, 404, 429, 5xx), or yields invalid telemetry, `RealRailwayDataProvider` logs the issue and delegates seamlessly to `SimulatorRailwayDataProvider`.
3. Fallback payloads explicitly carry `dataSource: "simulator"`. Simulated telemetry is **never** falsely labeled as live data.

---

## 6. Official Step-by-Step Activation Procedure

When official, authorized Indian Railways API credentials become available, follow this exact procedure to activate live tracking safely:

1. **Obtain Authorized API Credentials**: Secure official access credentials, base URL, and key from the authorized railway authority.
2. **Configure `.env`**: Create or edit `backend/.env` (ensure `.env` is listed in `.gitignore`):
   ```env
   RAILWAY_DATA_PROVIDER=real
   RAILWAY_API_ENABLED=true
   RAILWAY_API_BASE_URL=https://<official-api-endpoint>
   RAILWAY_API_KEY=<official-api-key>
   ```
3. **Start Backend**: Launch the Node/Express backend (`npm run dev` or `npm start`).
4. **Check Provider Status**: Query `GET http://localhost:5000/api/data-provider/status`. Verify that `provider` is `"real"`, `mode` is `"live"`, `apiEnabled` is `true`, and `apiConfigured` is `true`.
5. **Run Verification Endpoint**: Query `GET http://localhost:5000/api/data-provider/verify`. Verify that diagnostic status returns `"verified_active"`.
6. **Verify Live Train Endpoint**: Query `GET http://localhost:5000/api/live-trains/12952`. Confirm that `dataSource` returns `"real"` and `dataAgeSeconds` is accurate.
7. **Inspect Frontend UI**: Open `/train/12952` in the browser. Confirm that the header badge displays 🟢 **LIVE DATA** `(Updated X seconds ago)`.
8. **Verify Socket.IO Stream**: Confirm real-time updates arrive on channel `train:status:update`.
9. **Verify ML ETA Service**: Verify that `GET /api/train-eta/12952` consumes normalized real telemetry while maintaining synthetic model dataset disclaimers.
