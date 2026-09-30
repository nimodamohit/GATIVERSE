# Phase 19 — Real Live Speed, ETA Clarity & Real Station Timeline Audit & Fix Report

**Project**: GATIVERSE  
**Phase**: 19  
**Status**: Completed & Verified ✅  
**Date**: September 30, 2026  
**Environment**: Production Real Provider Mode (`RAILWAY_DATA_PROVIDER=real`, `RAILWAY_API_ENABLED=true`)

---

## 1. Executive Summary & Root Cause Analysis

### Identified Root Causes
1. **Speed Display Null Mapping**:
   - **Root Cause**: The raw RailRadar API response for train 12952 (`GET /v1/trains/12952/live`) returned `null` for `currentLocation.speedKmh`.
   - **Previous Bug**: Frontend displayed `"Not available"` or fell back to hardcoded simulator values (95/97 km/h).
   - **Fix**: Direct mapping preserves `null` speed when missing, displaying `"Speed unavailable"`. No fake or simulator speeds are substituted.

2. **Mock Station Timeline in Real Mode**:
   - **Root Cause**: `TrainDetailsClient.tsx` was passing `initialTrain.stations` (the 8 hardcoded mock stops from `mockTrains.ts`) to `JourneyTimeline` even when real route telemetry (`liveStatus.routeStops`, containing 221 stops) was present.
   - **Fix**: `JourneyTimeline` now consumes `liveStatus.routeStops` in real mode, dynamically rendering the actual RailRadar route with 221 total stops.

3. **Progress Calculation Discrepancy**:
   - **Root Cause**: `currLoc.segmentProgress` (0.0–1.0 segment progress between current and next station) was being mixed with `routeProgress` (full-route progress across all stops).
   - **Fix**: Defined distinct fields:
     - `segmentProgress`: Progress between current & next station (0.0 to 1.0 or 0 to 100%).
     - `routeProgress`: Full journey completion percentage calculated across the entire route sequence.

4. **Confusing ETA Presentation**:
   - **Root Cause**: The AI ETA card combined live telemetry delay (+30 min) and model-predicted additional delay (+6.8 min) into a single ambiguous `"Predicted Delay: +36.8 min"` label.
   - **Fix**: Restructured the AI ETA card into clear, non-overlapping sections: Scheduled Arrival, Live Expected Arrival, Current Live Delay, AI Predicted Additional Delay, AI Total Predicted Delay, and AI Predicted Final Arrival in clean IST format (`Asia/Kolkata` / `hh:mm AM/PM`).

---

## 2. Raw API Response Diagnostic (GET /v1/trains/12952/live)

```json
{
  "trainNumber": "12952",
  "trainName": "New Delhi - Mumbai Central Tejas Rajdhani Express",
  "journeyDate": "2026-09-30",
  "lastUpdatedAt": "2026-09-30T01:17:34.000Z",
  "currentLocation": {
    "stationCode": "RKM",
    "stationName": "Dr. Rk Nagar",
    "speedKmh": null,
    "segmentProgress": 0.45,
    "sequence": 151
  },
  "previousHalt": {
    "stationCode": "RTM",
    "stationName": "Ratlam Jn"
  },
  "nextHalt": {
    "stationCode": "BRC",
    "stationName": "Vadodara Jn"
  },
  "delayMinutes": 27,
  "routeLength": 221,
  "first3Stops": ["NDLS", "MTJ", "AGC"],
  "currentStop": "RKM",
  "nextStop": "BRC"
}
```

---

## 3. Implementation Details

### A. Speed Mapping Fix
- **Backend (`RealRailwayDataProvider.ts`)**:
  ```ts
  const speedVal = currLoc?.speedKmh ?? currLoc?.speed ?? raw.speed ?? raw.speed_kmph;
  const speed = speedVal !== undefined && speedVal !== null && Number.isFinite(speedVal) ? speedVal : null;
  ```
- **Frontend (`TrainDetailsClient.tsx`)**:
  ```ts
  const speedDisplay = isRealData
    ? liveStatus?.speed !== null && liveStatus?.speed !== undefined
      ? `${liveStatus.speed} km/h`
      : 'Speed unavailable'
    : liveStatus?.speed !== null && liveStatus?.speed !== undefined
    ? `${liveStatus.speed} km/h`
    : `${initialTrain.currentSpeedKmH} km/h`;
  ```

### B. Real Route Timeline & Usable Windowing (`JourneyTimeline.tsx`)
- **Usable Windowing**: To handle 221 stops efficiently without rendering hundreds of static DOM nodes, the timeline defaults to a moving window:
  - 3 completed previous stops
  - Current location station
  - 7 upcoming stops
  - `"Show full route (221 stops)"` / `"Show windowed view"` toggle button.
- **Auto-Advancing Window**: As `currentStopIndex` advances, `startWindow` and `endWindow` recalculate automatically.
- **Station Status Logic**:
  - `idx < currentStopIndex`: `PASSED` / `DEPARTED` (Emerald marker)
  - `idx === currentStopIndex`: `CURRENT STATION` (Blue pulsing marker)
  - `idx > currentStopIndex`: `UPCOMING` (Slate marker)

### C. Restructured AI ETA Card
The UI clearly distinguishes live telemetry from ML model additions:

| Metric | Source | Field / Format | Example Value |
|---|---|---|---|
| **Scheduled Arrival** | Railway Timetable | `scheduledArrival` (IST) | `08:35 AM` |
| **Live Expected Arrival** | Live Telemetry | `expectedArrival` (IST) | `09:05 AM` |
| **Current Live Delay** | Live Telemetry | `delayMinutes` | `+30 min` |
| **AI Predicted Add'l Delay** | ML Model | `predictedAdditionalDelayMinutes` | `+6.8 min` |
| **AI Total Predicted Delay** | Sum (Telemetry + ML) | `predictedTotalDelayMinutes` | `+36.8 min` |
| **AI Predicted Final Arrival** | ML Model | `predictedArrival` (IST) | `09:11 AM` |

- **Explanatory Notice**: *"AI prediction estimates the remaining journey time using the current train conditions."*
- **Model Source Tag**: `🤖 AI ETA — Synthetic Demo Model (1.0.0-synthetic-demo)`

### D. Timezone Consistency & Consistency Validation (`etaPrediction.service.ts`)
- All times are formatted consistently using `Asia/Kolkata` (`+05:30`).
- **Consistency Guard**:
  ```ts
  if (predTotalDelay < delayMinutes || predAddDelay < 0) {
    logger.warn('[ETA Validation] Inconsistent prediction: total delay < current live delay');
    return null; // Triggers PREDICTION_UNAVAILABLE
  }
  ```

---

## 4. Test Verification Results

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

====================================================
🎉 ALL GATIVERSE BACKEND TEST SUITES PASSED SUCCESSFULLY
====================================================
```

### ML Service Unit Tests (`pytest`)
```text
tests/test_eta.py ....                                                   [ 44%]
tests/test_phase17_ml.py .....                                           [100%]
======================== 9 passed in 2.93s =========================
```

### Build & Lint Verification
- **Backend Build & Lint**: `npm run lint` & `npm run build` -> 0 Errors.
- **Frontend Build & Lint**: `npm run lint` & `npm run build` -> 0 Errors.

---

## 5. Before vs. After Behavior Summary

| Aspect | Before Phase 19 | After Phase 19 |
|---|---|---|
| **Speed Display** | Showed "Not available" or simulator 97 km/h | Displays `"Speed unavailable"` when provider speed is null |
| **Station Timeline** | Showed 8 mock stops (Bhopal/Itarsi route) | Displays real 221-stop route from RailRadar |
| **Timeline Navigation** | Static 8 stops | Usable windowed view with auto-moving current station & full route toggle |
| **Route Progress** | Displayed segment progress as full route progress | Displays full `routeProgress` (0..100%) across all 221 stops |
| **AI ETA Card** | Merged delay metrics under single ambiguous label | Clear 5-point metric breakdown separating live delay from ML adjustment |
| **Timezone** | Mixed UTC ISO strings and IST times | Unified `Asia/Kolkata` (`+05:30`) formatting across all cards |
| **ETA Consistency** | Accepted predictions even if past scheduled | Rejects inconsistent predictions, returning `PREDICTION_UNAVAILABLE` |
