# GATIVERSE — Real Railway Data Integration Guide (Phase 7)

## 1. Overview & Current Architecture

GATIVERSE is designed with a provider abstraction layer (`RailwayDataProvider`) that decouples live railway data sources from downstream application services (Socket.IO streaming, ML ETA predictions, Journey Planner, and AI Assistant context).

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

## 2. Active Provider Status & Current Mode

**Current Active Mode**: `simulator` (Demo / Simulator Mode)

> **Important Notice:**
> GATIVERSE is currently configured and operating in **Simulator Mode** because official, authorized Indian Railways API credentials are not yet configured. The real provider integration infrastructure is fully built and ready to be activated as soon as official access is granted.
> No fake live data or unauthorized web scraping is performed.

---

## 3. Provider Architecture & Data Flow

### A. Simulator Provider (`SimulatorRailwayDataProvider`)
- Simulates realistic train movement across stations along authentic Indian Railway corridors (e.g., 12952 Rajdhani Express, 12002 Shatabdi Express, 12626 Kerala Express, 12138 Punjab Mail).
- Generates telemetry every few seconds with `dataSource: "simulator"`.
- Calculates telemetry freshness (`dataAgeSeconds`).

### B. Real Railway Provider (`RealRailwayDataProvider`)
- Implements `RailwayDataProvider`.
- Wraps `RailwayApiClient` which connects to the authorized railway REST API endpoint.
- Normalizes external telemetry into GATIVERSE's unified format (`dataSource: "real"`).
- Features request timeout protection (default 10,000 ms), non-blocking error handling, rate-limit awareness, and automatic fallback to simulator if credentials are missing or the API returns an error.

---

## 4. Configuration & Provider Switching

Provider selection is governed by environment variables in `backend/.env`:

```env
# Provider Selection: 'simulator' | 'real'
RAILWAY_DATA_PROVIDER=simulator

# Real Railway API Credentials & Endpoints (Required when RAILWAY_DATA_PROVIDER=real)
RAILWAY_API_BASE_URL=
RAILWAY_API_KEY=
RAILWAY_API_TIMEOUT_MS=10000
RAILWAY_API_ENABLED=false
```

### Provider Modes & Switching Rules:
1. `RAILWAY_DATA_PROVIDER=simulator`: Uses `SimulatorRailwayDataProvider`.
2. `RAILWAY_DATA_PROVIDER=real`:
   - If `RAILWAY_API_BASE_URL` and `RAILWAY_API_KEY` are provided and `RAILWAY_API_ENABLED=true`, initializes `RealRailwayDataProvider`.
   - If required credentials are missing or API activation fails, the provider safely falls back to `SimulatorRailwayDataProvider` and logs a descriptive configuration warning while reporting `dataSource: "simulator"`.

---

## 5. Provider Status REST Endpoint

GATIVERSE provides a public endpoint to inspect the active provider state:

`GET /api/data-provider/status`

### Response (Simulator Mode):
```json
{
  "success": true,
  "data": {
    "provider": "simulator",
    "mode": "demo",
    "available": true,
    "apiBaseUrlConfigured": false,
    "apiKeyConfigured": false,
    "fallbackActive": true,
    "fallbackReason": "Running in simulator mode (default)"
  }
}
```

### Response (Real Provider Active):
```json
{
  "success": true,
  "data": {
    "provider": "real",
    "mode": "live",
    "available": true,
    "apiBaseUrlConfigured": true,
    "apiKeyConfigured": true,
    "fallbackActive": false
  }
}
```

---

## 6. Normalized Data Format

All telemetry produced by either provider follows the normalized schema:

```json
{
  "trainNumber": "12952",
  "trainName": "New Delhi - Mumbai Central Rajdhani Express",
  "status": "DELAYED",
  "currentStation": "Near Bhopal Junction",
  "nextStation": "Itarsi Junction",
  "latitude": 23.2599,
  "longitude": 77.4126,
  "speed": 95,
  "delayMinutes": 35,
  "scheduledArrival": "07:15 PM",
  "expectedArrival": "07:50 PM",
  "progress": 62,
  "lastUpdated": "2026-09-29T18:15:00.000Z",
  "dataSource": "simulator",
  "dataAgeSeconds": 12,
  "modelDataSource": "synthetic-demo"
}
```

---

## 7. Visual LIVE vs DEMO Indicators in UI

The passenger frontend (`TrainDetailsClient.tsx`) displays clear visual badges based on `dataSource`:

- 🟢 **LIVE DATA** (`dataSource === "real"`): Indicates real-time feed from official railway API, with live update age in seconds.
- 🟡 **DEMO / SIMULATOR DATA** (`dataSource === "simulator"`): Transparently informs passengers that the train position is simulated.

---

## 8. Fallback Strategy

When `RAILWAY_DATA_PROVIDER=real` is configured:
1. `RealRailwayDataProvider` attempts to fetch live status via `RailwayApiClient`.
2. If the API request times out, fails with HTTP errors (401, 403, 404, 5xx), or receives malformed data, `RealRailwayDataProvider` logs the error and falls back gracefully to `SimulatorRailwayDataProvider`.
3. Fallback responses explicitly specify `dataSource: "simulator"` so that simulated data is **never** mislabeled as live real-world data.

---

## 9. Security & Compliance

- **No Secrets Committed**: All API keys, tokens, and base URLs are managed strictly via `.env` (excluded by `.gitignore`).
- **No Web Scraping**: GATIVERSE strictly avoids unauthorized web scraping, CAPTCHA bypass, or bypassing robots.txt / access controls.
- **Log Masking**: API keys and tokens are strictly excluded from server log outputs.

---

## 10. AI / ML Integration & Limitations

- **XGBoost ML ETA Model**: The Phase 4 ML service processes normalized telemetry regardless of data source.
- **Synthetic Model Disclaimer**: The current XGBoost model was trained on synthetic/demo historical delay datasets (`modelDataSource: "synthetic-demo"`). It is not claimed to be production-accurate for real Indian Railway networks until retrained on official historical telemetry.
- **AI Assistant Transparency**: The AI Journey Assistant checks `dataSource` before responding, framing answers appropriately ("According to current live railway data..." vs "This is simulator/demo train data.").

---

## 11. What is Still Required for Live Indian Railway Activation?

To transition GATIVERSE to live Indian Railways tracking in production:

1. **Official API Partnership / Authorization**: Obtain authorized API access credentials from an official railway data provider or partner API portal.
2. **Environment Configuration**: Set the following in `backend/.env`:
   ```env
   RAILWAY_DATA_PROVIDER=real
   RAILWAY_API_BASE_URL=https://<official-api-endpoint>
   RAILWAY_API_KEY=<your-authorized-api-key>
   RAILWAY_API_ENABLED=true
   ```
3. **Response Schema Mapping Verification**: Verify that `RailwayApiClient.ts` mapping aligns with the exact JSON schema provided by the official API documentation.
4. **Historical Telemetry Retraining**: Train the Phase 4 XGBoost model using historical telemetry provided by the official railway authority.
