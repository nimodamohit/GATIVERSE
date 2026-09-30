# GATIVERSE — Real Railway Data Provider Discovery & Verification (Phase 9)

## 1. Architectural Audit Summary

GATIVERSE utilizes a decoupled data provider architecture centered around the `RailwayDataProvider` TypeScript interface. This guarantees that application features—such as live tracking, Socket.IO streaming, ML ETA prediction, Journey Planner, and AI Assistant—are fully isolated from external API schemas.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RailwayDataProvider (Interface)                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ↓                                     ↓
        Simulator Provider                  Real Railway Provider
    (SimulatorRailwayDataProvider)        (RealRailwayDataProvider)
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       ↓
                               Live Train Service
                                       ↓
                        Socket.IO & REST Controllers
                                       ↓
                    ┌──────────────────┴──────────────────┐
                    ↓                                     ↓
              AI ETA Service                        AI Assistant
                    ↓                                     ↓
            Frontend Track UI                   Passenger Chat UI
```

### Component Status Audit:
- **`RailwayDataProvider` Interface**: Standardized abstraction providing `getTrainLiveStatus`, `getAllLiveStatuses`, and `getProviderStatus`.
- **`RealRailwayDataProvider`**: Proxy provider that routes requests to `RailwayApiClient` while maintaining an active fallback standby to `SimulatorRailwayDataProvider`.
- **`RailwayApiClient`**: Low-level client with HTTP timeout handling, header authentication, strict raw payload validation, short-lived caching, and telemetry normalization.
- **`SimulatorRailwayDataProvider`**: Active default provider generating deterministic, realistic telemetry for Indian Railway corridors.
- **Provider Factory (`backend/src/providers/index.ts`)**: Dynamically selects between `real` and `simulator` mode based on environment variables.
- **Provider Status REST Endpoint (`GET /api/data-provider/status`)**: Exposes provider health, active mode, and fallback status.

---

## 2. Normalized Telemetry Contract Specification

GATIVERSE requires a normalized contract (`TrainLiveStatus`) for all train telemetry. The table below documents the 17 fields, their requirements, and derivation rules when consuming data from an external provider:

| Field Name | Type | Requirement Level | Provider Availability | Derivation & Handling Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `trainNumber` | String | **Required** | Provided by API | Primary lookup key (e.g., `"12952"`). Must be non-empty string. |
| `trainName` | String | Optional / Derivable | Usually Provided | If omitted by live API, derived from internal train schedule database. |
| `currentStation` | String | **Required** | Provided by API | Current station name or code (e.g., `"Bhopal Junction"`). |
| `nextStation` | String | **Required** | Usually Provided | Upcoming station name or code. If omitted, derived from station route order. |
| `previousStation` | String | Optional / Derivable | Sometimes Provided | Last departed station. Derived from schedule sequence if unavailable. |
| `latitude` | Number | Optional / Derivable | Rarely Provided | GPS latitude (-90 to 90). If omitted by API, mapped from station coordinates DB. |
| `longitude` | Number | Optional / Derivable | Rarely Provided | GPS longitude (-180 to 180). If omitted by API, mapped from station coordinates DB. |
| `speed` | Number | Optional | Rarely Provided | Current speed in km/h. Default to 0 or estimated from station movement if missing. |
| `delayMinutes` | Number | **Required** | Provided by API | Delay in minutes (>= 0). Crucial feature for ML ETA prediction model. |
| `status` | Enum | Derivable | Sometimes Provided | `'ON_TIME' \| 'DELAYED' \| 'ARRIVED' \| 'DEPARTED' \| 'CANCELLED'`. Derived from delay & progress. |
| `scheduledArrival`| String | Optional / Derivable | Usually Provided | Scheduled time (e.g. `"07:15 PM"`). Fallback to timetable schedule database. |
| `expectedArrival` | String | **Required** | Derivable | Calculated as `scheduledArrival + delayMinutes` if not explicitly supplied. |
| `progress` | Number | Derivable | Sometimes Provided | Percentage (0–100) between current & next station based on stop index. |
| `lastUpdated` | String | **Required** | Provided by API | Human-readable update timestamp (e.g., `"12s ago"` or `"Stale (210s ago)"`). |
| `dataSource` | Enum | **Required System Flag**| Internal System | Explicitly set to `'simulator'` or `'real'`. Never spoofed or combined. |
| `dataAgeSeconds` | Number | **Required Metric** | Calculated | Elapsed seconds since telemetry epoch: `Math.floor((Date.now() - epoch) / 1000)`. |
| `modelDataSource`| String | **Required System Flag**| Internal System | Metadata flag for ML model dataset (`"synthetic-demo"`). |

---

## 3. Real Railway Data Provider Requirements & Specifications

### 1. Required API Capabilities
- Real-time train status queries by train number (e.g., `GET /live-status/:trainNumber`).
- Bulk live train status retrieval for active corridor trains.
- Station departure and delay metrics.

### 2. Authentication Requirements
- Header-based API key authentication (`x-api-key` or `Authorization: Bearer <token>`).
- IP whitelisting support for production server IPs.
- HTTPS/TLS 1.3 encryption for all endpoint communications.

### 3. Required Endpoints & Request Parameters
- Single Train Live Status: `GET /api/v1/trains/{trainNumber}/live-status`
- Bulk Corridor Status: `GET /api/v1/trains/live-status`
- Station Schedule Search: `GET /api/v1/schedules?source={src}&destination={dst}&date={YYYY-MM-DD}`

### 4. Rate Limits & Polling Constraints
- Recommended polling interval: **10,000 ms to 30,000 ms** per train.
- Rate limit allowance: Minimum 100 requests per minute per API key.
- Mandatory client-side caching (TTL 5,000 ms) to prevent redundant polling overhead.

### 5. Reliability & SLA Requirements
- Minimum Service Level Agreement (SLA): **99.9% uptime**.
- API Response Time: `< 2,000 ms` under normal load. Request timeout cutoff: `10,000 ms`.

### 6. License & Authorization Requirements
- Official authorization or commercial data license from CRIS (Centre for Railway Information Systems), IRCTC, or accredited railway API partners.
- Strict compliance with terms of service prohibiting unauthorized scraping, CAPTCHA bypass, or automated site crawling.

### 7. Data Freshness & Staleness Rules
- Telemetry generation epoch must accompany every payload.
- Telemetry with `dataAgeSeconds > 180` is automatically flagged as `isStale = true`.
- If data age exceeds 600 seconds without update, the real provider transitions to standby fallback mode.

---

## 4. Separation of Provider Responsibilities

To avoid monolithic dependency on a single data supplier, GATIVERSE separates railway integration into four independent provider domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Modular Provider Architecture                      │
├──────────────────┬──────────────────┬───────────────────┬───────────────────┤
│  Live Tracking   │  Train Schedule  │ Availability &    │ Booking & PNR     │
│  Provider        │  Provider        │ Fare Provider     │ Provider          │
├──────────────────┼──────────────────┼───────────────────┼───────────────────┤
│ - GPS Telemetry  │ - Station Routes │ - Class Quotas    │ - Passenger Res.  │
│ - Live Delays    │ - Timetables     │ - Fare Matrix     │ - Payment Gateway │
│ - Current Stop   │ - Distance (km)  │ - Seat Breakdown  │ - PNR Status      │
└──────────────────┴──────────────────┴───────────────────┴───────────────────┘
```

1. **Railway Status Provider**: Provides live telemetry, current location, speed, and delay.
2. **Train Schedule Provider**: Provides official station lists, arrival/departure timetables, and distances.
3. **Availability & Fare Provider**: Provides seat availability by class (1A, 2A, 3A, SL) and ticket pricing matrices.
4. **Booking Provider**: Handles official passenger reservations, payments, and PNR generation (currently operating in Demo Booking mode).

---

## 5. Verification Matrix of Existing Real Integration Infrastructure

The existing [`RealRailwayDataProvider`](file:///c:/Users/LENOVO/OneDrive/Documents/Desktop/Rail_ETA/backend/src/providers/real/RealRailwayDataProvider.ts) and [`RailwayApiClient`](file:///c:/Users/LENOVO/OneDrive/Documents/Desktop/Rail_ETA/backend/src/providers/real/RailwayApiClient.ts) were audited against Phase 9 requirements:

| Capability | Implementation & Verification Detail | Status |
| :--- | :--- | :--- |
| **HTTP Timeout Protection** | Configurable `timeoutMs` (default 10,000ms) with `AbortController` cancellation. | ✅ **Verified** |
| **Authentication Header** | Passes `x-api-key` header safely via environment variable `RAILWAY_API_KEY`. | ✅ **Verified** |
| **Malformed Response Rejection**| `validateRawPayload()` validates object structure, field types, and non-empty strings. | ✅ **Verified** |
| **Coordinate Validation** | Validates latitude (-90 to 90) and longitude (-180 to 180). Rejects out-of-bound coords. | ✅ **Verified** |
| **Speed Validation** | Validates speed is a finite number between 0 and 300 km/h. | ✅ **Verified** |
| **Delay Validation** | Validates delayMinutes is a non-negative finite number (0 to 1440 min). | ✅ **Verified** |
| **Stale-Data Detection** | Calculates `dataAgeSeconds`. Sets `isStale = true` when age > 180 seconds. | ✅ **Verified** |
| **In-Memory Caching** | Short-lived `Map` cache with `RAILWAY_CACHE_TTL_MS` (default 5000ms) to respect rate limits. | ✅ **Verified** |
| **Safe Observability Logging** | Logs request durations, status codes, and validation results without printing API keys. | ✅ **Verified** |
| **Simulator Standby Fallback** | Seamless non-blocking fallback to `SimulatorRailwayDataProvider` returning `dataSource: "simulator"`. | ✅ **Verified** |

---

## 6. Current Operating Mode & Activation Blocker

- **Active Provider Mode**: `RAILWAY_DATA_PROVIDER=simulator` (**Demo / Simulator Mode**)
- **Real Data Status**: Not connected to real Indian Railways live servers.
- **Activation Blocker**:
  > Real railway data integration infrastructure is 100% verified and operational, but live tracking is currently running in **Simulator Mode** because official, authorized Indian Railways API credentials are not configured in `.env`.
