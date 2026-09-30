# Phase 19 Urgent Regression Fix Report

**Project**: GATIVERSE  
**Phase**: 19 Regression Fix  
**Status**: Resolved & Verified ✅  
**Date**: September 30, 2026  
**Environment**: Production Real Provider Mode (`RAILWAY_DATA_PROVIDER=real`, `RAILWAY_API_ENABLED=true`)

---

## 1. Root Cause & Bad Data Path Analysis

### Observed Issue
Upon server restart or when the RailRadar API returned HTTP 429 (Rate Limit Exceeded), the live status page for train 12952 (`http://localhost:3000/train/12952`) displayed:
- `LIVE DATA STALE (0s old)`
- `Current Location: Not available`
- `Next Station: Not available`
- `Speed: Speed unavailable`
- `Expected Arrival: Not available`
- `Route Progress: 0%`
- `Station Timeline: 8 Total Stops`
- `AI ETA: Predicting...`

### Root Causes
1. **Uninitialized Fallback Response Bug**:
   - When no cached real snapshot existed in `RealRailwayDataProvider` (e.g. initial server startup during API 429 rate limit), `getTrainLiveStatus` returned an uninitialized status object containing:
     - `dataAgeSeconds: 0`
     - `isStale: true`
     - `totalStops: 8`
     - `progress: 0`
   - **Impact**: The UI received `isStale: true` and `dataAgeSeconds: 0`, rendering `LIVE DATA STALE (0s old)`. `totalStops: 8` triggered `JourneyTimeline` to fall back to `initialTrain.stations` (the 8 mock stops), and `progress: 0` rendered `0% Journey Completed`.

2. **Hardcoded Stale Flag in Cached Snapshots**:
   - In `RealRailwayDataProvider.ts`, returning cached snapshots executed:
     ```ts
     return {
       ...cached.status,
       dataSource: 'real',
       isStale: true, // HARDCODED!
       dataAgeSeconds: ageSec,
     };
     ```
   - **Impact**: Even when `ageSec` was 2s or 10s (fresh data < 180s), `isStale` was forced to `true`.

3. **Frontend Mock Station Fallback**:
   - `JourneyTimeline.tsx` evaluated `rawList = isRealData && routeStops ? routeStops : null`. When `routeStops` was missing or empty, `rawList` evaluated to `null`, causing `JourneyTimeline` to fall back to `stations` (the 8 mock stops).

4. **Socket.IO Overwrite Bug**:
   - Socket.IO `train:status:update` listener overwrote React state unconditionally with incoming payloads, replacing valid real location snapshots with empty fallback snapshots during temporary API ticks.

---

## 2. Technical Solution & Data Flow Fixes

### A. Real Provider Fallback Fix (`RealRailwayDataProvider.ts`)
1. **Stale Age Calculation**:
   - `ageSec = Math.max(0, Math.floor((Date.now() - cached.timestamp) / 1000))`
   - `isStale = ageSec >= 180`
   - Now returns `isStale: false` when data age < 180s.
2. **Uninitialized Fallback Fix**:
   - When no previous snapshot exists (`!cached`):
     - `dataAgeSeconds: undefined` (prevents `0s old` text)
     - `progress: null` (prevents `0% Journey Completed`)
     - `totalStops: undefined` (prevents `8 Total Stops`)
     - `currentStopIndex: undefined`

### B. En Route Station Mapping (`RealRailwayDataProvider.ts`)
- If `currentLocation` is unavailable but `previousHalt` and `nextHalt` exist:
  ```ts
  if (!currentStation && (previousStation || nextStation)) {
    currentStation = 'En route';
  }
  ```

### C. Station Timeline Isolation (`JourneyTimeline.tsx`)
- When `isRealData` is `true`:
  - `JourneyTimeline` **NEVER** falls back to `mockTrains` / `initialTrain.stations`.
  - If real route stops exist: renders full route sequence (`"{actualTotalStops} Route Points"`).
  - If real route stops are unavailable: renders a clean notice: `"Route timeline temporarily unavailable — Syncing live route telemetry..."`.

### D. Progress Display (`TrainDetailsClient.tsx`)
- If `progressPercent` is `null` / `undefined`:
  - Displays `"Journey progress unavailable"`. Never displays `"0% Journey Completed"`.

### E. AI ETA Service & Display (`etaPrediction.service.ts` & `TrainDetailsClient.tsx`)
- `getETAPredictionService` checks if `!liveStatus.currentStation && !liveStatus.expectedArrival`. If missing, returns `null` (`503 PREDICTION_UNAVAILABLE`).
- Frontend displays `"AI ETA unavailable"` instead of `"Predicting..."`.

### F. Socket.IO Overwrite Protection (`useLiveTrainStatus.ts`)
- Added validation inside `train:status:update` listener:
  - If previous React state contains valid real location/route, and incoming tick is empty due to API rate-limiting, the hook retains the last known real snapshot marked `isStale: true`.

---

## 3. Test Verification Results

### Backend Test Suite Execution (`npm test`)

```text
====================================================
GATIVERSE — Complete Test Suite Execution
====================================================

--- 1. Telemetry Mapping Tests (provider.test.ts): 8/8 PASSED
--- 2. Real Train Search Tests (search.test.ts): 5/5 PASSED
--- 3. Real Journey Planner Tests (journeyPlanner.test.ts): 13/13 PASSED
--- 4. Phase 17 Collector & ML Tests (phase17Collector.test.ts): 17/17 PASSED
--- 5. Phase 18 Real Provider Fallback Tests (phase18RealFallback.test.ts): 12/12 PASSED
--- 6. Phase 19 Real Live Status & ETA Tests (phase19TimelineAndEta.test.ts): 17/17 PASSED
--- 7. Phase 19 Urgent Regression Fix Tests (phase19RegressionFix.test.ts): 11/11 PASSED

====================================================
🎉 ALL GATIVERSE BACKEND TEST SUITES PASSED SUCCESSFULLY
====================================================
```

### ML Service Unit Tests (`pytest`)
```text
tests/test_eta.py ....                                                   [ 44%]
tests/test_phase17_ml.py .....                                           [100%]
======================== 9 passed in 2.30s =========================
```

### Build & Lint Verification
- **Backend**: `npm run lint` & `npm run build` -> **0 Errors**
- **Frontend**: `npm run lint` & `npm run build` -> **0 Errors**

---

## 4. Summary of Resolved Behaviors

| Feature / State | Before Regression Fix | After Regression Fix |
|---|---|---|
| **Stale Badge Age** | Displayed `LIVE DATA STALE (0s old)` | Displays `LIVE DATA (Updated Xs ago)` when age < 180s, `LIVE DATA STALE (Xs old)` when age >= 180s, or `LIVE DATA STALE` without `0s old` when uninitialized |
| **Last Known Real Snapshot** | Lost on API failure tick | Retained and displayed with actual age |
| **Timeline in Real Mode** | Reverted to 8 mock stops when telemetry pending | Displays real route points or `"Route timeline temporarily unavailable"` |
| **Route Progress** | Displayed `0% Journey Completed` | Displays `"Journey progress unavailable"` when progress is null |
| **Current Station Mapping** | `Not available` when between stops | Maps to `"En route"` when previous & next halts exist |
| **AI ETA State** | Displayed `Predicting...` with empty inputs | Displays `"AI ETA unavailable"` |
| **Socket.IO Stream** | Overwrote valid snapshot with empty tick | Retains last known real snapshot marked stale |
