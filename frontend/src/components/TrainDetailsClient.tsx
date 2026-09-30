'use client';

import React from 'react';
import Link from 'next/link';
import { TrainDetails, StationStop, getAlternativeTrains } from '@/data/mockTrains';
import { StatusBadge } from '@/components/StatusBadge';
import { JourneyTimeline } from '@/components/JourneyTimeline';
import { TrackLastCheckedTrain } from '@/components/TrackLastCheckedTrain';
import { useLiveTrainStatus } from '@/hooks/useLiveTrainStatus';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Gauge,
  Navigation,
  TrainTrack,
  Calendar,
  Shuffle,
  Wifi,
  WifiOff,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface TrainDetailsClientProps {
  train: TrainDetails;
}

export const TrainDetailsClient: React.FC<TrainDetailsClientProps> = ({ train: initialTrain }) => {
  const { liveStatus, etaPrediction, predictionState, isConnected, error } = useLiveTrainStatus(initialTrain.trainNumber);

  // Compute live or fallback fields
  const isRealData = liveStatus?.dataSource === 'real';

  const currentStation = isRealData
    ? liveStatus.currentStation || 'Not available'
    : liveStatus?.currentStation || initialTrain.currentStation;

  const nextStation = isRealData
    ? liveStatus.nextStation || 'Not available'
    : liveStatus?.nextStation ||
      (initialTrain.stations.find((s: StationStop) => s.status === 'upcoming')?.stationName || initialTrain.destination);

  const previousStation = isRealData
    ? liveStatus.previousStation || 'Not available'
    : liveStatus?.previousStation || initialTrain.source;

  const formatISTTime = (isoOrTimeStr?: string | null): string => {
    if (!isoOrTimeStr) return 'Not available';
    if (isoOrTimeStr.includes('T')) {
      try {
        const date = new Date(isoOrTimeStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
          });
        }
      } catch {
        // fallback
      }
    }
    return isoOrTimeStr;
  };

  const speedDisplay = isRealData
    ? liveStatus?.speed !== null && liveStatus?.speed !== undefined
      ? `${liveStatus.speed} km/h`
      : 'Speed unavailable'
    : liveStatus?.speed !== null && liveStatus?.speed !== undefined
    ? `${liveStatus.speed} km/h`
    : `${initialTrain.currentSpeedKmH} km/h`;

  const delayMinutes = liveStatus ? liveStatus.delayMinutes : initialTrain.delayMinutes;

  let currentStatus: TrainDetails['currentStatus'] = initialTrain.currentStatus;
  if (liveStatus) {
    if (liveStatus.status === 'CANCELLED') currentStatus = 'Cancelled';
    else if (liveStatus.delayMinutes > 5 || liveStatus.status === 'DELAYED') currentStatus = 'Delayed';
    else currentStatus = 'On Time';
  }

  const expectedArrivalRaw = isRealData
    ? liveStatus.expectedArrival || null
    : liveStatus?.expectedArrival ||
      (initialTrain.stations.find((s: StationStop) => s.status === 'current')?.actualArrival || initialTrain.arrivalTime);
  
  const expectedArrival = formatISTTime(expectedArrivalRaw);
  const scheduledArrival = formatISTTime(initialTrain.arrivalTime);

  const lastUpdated = liveStatus?.lastUpdated || initialTrain.lastUpdated;

  // Compute station timeline state dynamically
  const currentStopIndex =
    liveStatus?.currentStopIndex ?? initialTrain.stations.findIndex((s: StationStop) => s.status === 'current');

  const updatedStations: StationStop[] = initialTrain.stations.map((stop: StationStop, idx: number) => {
    let status: 'passed' | 'current' | 'upcoming' = 'upcoming';
    if (currentStopIndex >= 0) {
      if (idx < currentStopIndex) status = 'passed';
      else if (idx === currentStopIndex) status = 'current';
      else status = 'upcoming';
    } else {
      status = stop.status;
    }

    let actualArrival = stop.actualArrival;
    if (idx === currentStopIndex && liveStatus) {
      actualArrival = expectedArrival;
    }

    return {
      ...stop,
      status,
      actualArrival,
    };
  });

  // Calculate route progress percentage dynamically across whole route
  const progressPercent = liveStatus
    ? (liveStatus.progress !== undefined && liveStatus.progress !== null ? Math.min(100, Math.max(0, Math.round(liveStatus.progress))) : null)
    : Math.min(100, Math.round((initialTrain.distanceCoveredKm / initialTrain.totalDistanceKm) * 100));

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <TrackLastCheckedTrain trainNumber={initialTrain.trainNumber} />

      {/* Back Link & Live Indicator Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Back to Search Results</span>
        </Link>

        {/* Live Status Connection & Data Source Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          {liveStatus?.dataSource === 'real' ? (
            liveStatus.isStale ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-50 text-rose-900 font-bold text-xs rounded-full border border-rose-300 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>🔴 LIVE DATA STALE</span>
                {liveStatus.dataAgeSeconds !== undefined && liveStatus.dataAgeSeconds > 0 && (
                  <span className="text-[11px] font-normal text-rose-700">
                    ({liveStatus.dataAgeSeconds}s old)
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-full border border-emerald-400 shadow-2xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>🟢 LIVE DATA</span>
                {liveStatus.dataAgeSeconds !== undefined && (
                  <span className="text-[11px] font-normal text-emerald-700">
                    (Updated {liveStatus.dataAgeSeconds}s ago)
                  </span>
                )}
              </div>
            )
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-50 text-amber-900 font-bold text-xs rounded-full border border-amber-300 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>🟡 DEMO / SIMULATOR DATA</span>
              {liveStatus?.dataAgeSeconds !== undefined ? (
                <span className="text-[11px] font-normal text-amber-800">
                  (Updated {liveStatus.dataAgeSeconds}s ago)
                </span>
              ) : (
                <span className="text-[11px] font-normal text-amber-800">
                  ({lastUpdated})
                </span>
              )}
            </div>
          )}

          {isConnected ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-full border border-slate-200">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>Connected</span>
            </div>
          ) : error ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 font-medium text-xs rounded-full border border-amber-200">
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>Reconnecting...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 font-medium text-xs rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1 bg-blue-600 text-white font-mono font-bold text-sm rounded-lg">
                {initialTrain.trainNumber}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {initialTrain.trainName}
              </h1>
            </div>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span>{initialTrain.source} ({initialTrain.sourceCode})</span>
              <span>→</span>
              <span>{initialTrain.destination} ({initialTrain.destinationCode})</span>
            </p>
          </div>

          <StatusBadge status={currentStatus} delayMinutes={delayMinutes} size="lg" />
        </div>

        {/* Live Telemetry KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              Current Location
            </span>
            <div className="text-base sm:text-lg font-bold text-white truncate">
              {currentStation}
            </div>
            {previousStation && previousStation !== 'Not available' && (
              <span className="text-[11px] text-slate-400 block truncate">
                Prev: {previousStation}
              </span>
            )}
            {liveStatus && liveStatus.latitude !== null && liveStatus.longitude !== null ? (
              <span className="text-[11px] font-mono text-slate-400">
                {liveStatus.latitude}, {liveStatus.longitude}
              </span>
            ) : (
              <span className="text-[11px] font-mono text-slate-500">
                Live GPS position unavailable
              </span>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              Next Station
            </span>
            <div className="text-base sm:text-lg font-bold text-white truncate">
              {nextStation}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Current Speed
            </span>
            <div className="text-base sm:text-lg font-bold text-emerald-300">
              {speedDisplay}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Expected Arrival
            </span>
            <div className="text-base sm:text-lg font-bold text-amber-300">
              {expectedArrival}
            </div>
          </div>
        </div>

        {/* Journey Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span>Route Progress</span>
            <span>{progressPercent !== null ? `${progressPercent}% Journey Completed` : 'Journey progress unavailable'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent !== null ? progressPercent : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Timeline */}
        <div className="lg:col-span-8">
          <JourneyTimeline
            stations={updatedStations}
            routeStops={liveStatus?.routeStops}
            currentStopIndex={liveStatus?.currentStopIndex}
            totalStops={liveStatus?.totalStops}
            isRealData={isRealData}
          />
        </div>

        {/* Right Column: Schedule & AI ETA Cards */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI ETA Prediction Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white rounded-2xl p-6 space-y-4 shadow-lg border border-indigo-700/50">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-indigo-200">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>AI ETA Prediction</span>
              </div>
              <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-full border border-indigo-400/30">
                {etaPrediction ? `Model ${etaPrediction.modelVersion}` : predictionState === 'predicting' ? 'Predicting...' : 'Unavailable'}
              </span>
            </div>

            {predictionState === 'unavailable' ? (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>AI ETA prediction temporarily unavailable</span>
              </div>
            ) : etaPrediction ? (
              <div className="space-y-4">
                {/* AI Predicted Final Arrival Highlight */}
                <div className="p-3.5 bg-indigo-950/80 rounded-xl border border-indigo-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-indigo-300 block font-medium">AI Predicted Final Arrival</span>
                    <span className="text-2xl font-black text-amber-300 tracking-tight">
                      {formatISTTime(etaPrediction.predictedArrival)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-indigo-300 block font-medium">AI Enroute Add&apos;l Delay</span>
                    <span className="text-base font-extrabold text-amber-400">
                      +{etaPrediction.predictedAdditionalDelayMinutes} min
                    </span>
                  </div>
                </div>

                {/* Clear Separate Metrics Comparison */}
                <div className="space-y-2 text-xs text-indigo-200 bg-slate-900/60 p-3.5 rounded-xl border border-indigo-900/50">
                  <div className="flex justify-between py-1 border-b border-indigo-900/60">
                    <span className="text-indigo-400 font-medium">Scheduled Arrival:</span>
                    <strong className="text-white">{scheduledArrival}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-900/60">
                    <span className="text-indigo-400 font-medium">Live Expected Arrival:</span>
                    <strong className="text-amber-300">{expectedArrival}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-900/60">
                    <span className="text-indigo-400 font-medium">Current Live Delay:</span>
                    <strong className="text-rose-300">+{delayMinutes} min</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-indigo-900/60">
                    <span className="text-indigo-400 font-medium">AI Predicted Add&apos;l Delay:</span>
                    <strong className="text-amber-400">+{etaPrediction.predictedAdditionalDelayMinutes} min</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-indigo-400 font-medium">AI Total Predicted Delay:</span>
                    <strong className="text-rose-400">+{etaPrediction.predictedTotalDelayMinutes} min</strong>
                  </div>
                </div>

                {/* Model Tag */}
                <div className="pt-2 text-[11px] font-semibold text-indigo-200 border-t border-indigo-900/40 flex items-center gap-1.5">
                  {etaPrediction.modelSource === 'real-railway-telemetry' ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md border border-emerald-500/30">
                      🤖 AI ETA — Real Railway Telemetry Model ({etaPrediction.modelVersion})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md border border-indigo-500/30">
                      🤖 AI ETA — Synthetic Demo Model ({etaPrediction.modelVersion})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-indigo-300 space-y-2">
                <div className="animate-spin w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto"></div>
                <p>Calculating dynamic ETA via XGBoost model...</p>
              </div>
            )}

            <p className="text-[11px] text-indigo-300/80 leading-snug border-t border-indigo-900/80 pt-3">
              AI prediction estimates the remaining journey time using the current train conditions.
            </p>
          </div>

          {/* Schedule Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Schedule Information</span>
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Scheduled Departure:</span>
                <strong className="text-slate-900">{initialTrain.departureTime}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Scheduled Arrival:</span>
                <strong className="text-slate-900">{initialTrain.arrivalTime}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Duration:</span>
                <strong className="text-slate-900">{initialTrain.duration}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Runs On:</span>
                <span className="text-slate-800 font-mono text-xs">{initialTrain.runsOn.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Telemetry Sync:</span>
                <span className="text-emerald-700 font-semibold">{lastUpdated}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-5 space-y-2 text-xs text-blue-900">
            <div className="flex items-center gap-1.5 font-bold">
              <TrainTrack className="w-4 h-4 text-blue-700" />
              <span>GATIVERSE Real-Time Data Engine</span>
            </div>
            <p className="leading-relaxed text-blue-800">
              Live updates are streamed over Socket.IO from the GATIVERSE Data Provider. Coordinates, current station, speed, and ETA recalculate continuously.
            </p>
          </div>

          {/* Alternative Trains Suggestion Card */}
          {delayMinutes > 0 && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Shuffle className="w-4 h-4 text-amber-700" />
                <span>Alternative Trains Suggested</span>
              </div>
              <p className="text-xs text-amber-800">
                Due to current delay (+{delayMinutes} min), consider checking on-time connections:
              </p>
              <div className="space-y-2 pt-1">
                {getAlternativeTrains(initialTrain.trainNumber).slice(0, 2).map((alt: TrainDetails) => (
                  <Link
                    key={alt.trainNumber}
                    href={`/train/${alt.trainNumber}`}
                    className="block p-2.5 bg-white rounded-xl border border-amber-200/80 hover:border-amber-400 transition-all text-xs"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{alt.trainNumber} {alt.trainName}</span>
                      <span className="text-emerald-700 font-medium">{alt.currentStatus}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      Departs: {alt.departureTime} • {alt.source} → {alt.destination}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
