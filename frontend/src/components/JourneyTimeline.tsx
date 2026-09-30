'use client';

import React, { useState } from 'react';
import { StationStop } from '@/data/mockTrains';
import { LiveRouteStopPayload } from '@/hooks/useLiveTrainStatus';
import { CheckCircle2, Radio, Circle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export interface JourneyTimelineProps {
  stations?: StationStop[];
  routeStops?: LiveRouteStopPayload[];
  currentStopIndex?: number;
  totalStops?: number;
  isRealData?: boolean;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  stations = [],
  routeStops,
  currentStopIndex = -1,
  totalStops,
  isRealData = false,
}) => {
  const [showFullRoute, setShowFullRoute] = useState<boolean>(false);

  // Normalize stops into a unified structure
  const rawList = isRealData ? (routeStops && routeStops.length > 0 ? routeStops : []) : null;
  const isTimelineUnavailable = isRealData && Boolean(rawList && rawList.length === 0);
  const actualTotalStops = totalStops || (rawList ? rawList.length : stations.length);

  // Derive current stop index if not explicitly passed
  let derivedCurrentIdx = currentStopIndex;
  if (derivedCurrentIdx < 0) {
    if (rawList && rawList.length > 0) {
      derivedCurrentIdx = rawList.findIndex(
        (s) => s.status && (s.status.toUpperCase().includes('CURRENT') || s.status.toUpperCase().includes('RUNNING') || s.status.toUpperCase().includes('AT STATION'))
      );
      if (derivedCurrentIdx < 0) derivedCurrentIdx = 0;
    } else {
      derivedCurrentIdx = stations.findIndex((s) => s.status === 'current');
      if (derivedCurrentIdx < 0) derivedCurrentIdx = 0;
    }
  }

  // Build unified stop items
  const unifiedStops = rawList
    ? rawList.map((stop, idx) => {
        let statusTag: 'passed' | 'departed' | 'current' | 'upcoming' = 'upcoming';
        if (idx < derivedCurrentIdx) {
          statusTag = stop.actualDeparture || stop.status?.toUpperCase().includes('DEPART') ? 'departed' : 'passed';
        } else if (idx === derivedCurrentIdx) {
          statusTag = 'current';
        } else {
          statusTag = 'upcoming';
        }

        // Format scheduled/actual arrival
        const scheduledArr = stop.scheduledArrival
          ? stop.scheduledArrival.includes('T')
            ? new Date(stop.scheduledArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : stop.scheduledArrival
          : null;

        const actualArr = stop.actualArrival
          ? stop.actualArrival.includes('T')
            ? new Date(stop.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : stop.actualArrival
          : null;

        const delay = stop.delayArrival !== undefined && stop.delayArrival !== null ? stop.delayArrival : null;

        return {
          sequence: stop.sequence || idx + 1,
          stationCode: stop.stationCode,
          stationName: stop.stationName || stop.stationCode,
          scheduledArrival: scheduledArr,
          actualArrival: actualArr,
          delayMinutes: delay,
          statusTag,
          platform: stop.platform || null,
        };
      })
    : stations.map((stop, idx) => {
        let statusTag: 'passed' | 'departed' | 'current' | 'upcoming' = 'upcoming';
        if (derivedCurrentIdx >= 0) {
          if (idx < derivedCurrentIdx) statusTag = 'passed';
          else if (idx === derivedCurrentIdx) statusTag = 'current';
          else statusTag = 'upcoming';
        } else {
          statusTag = stop.status === 'passed' ? 'passed' : stop.status === 'current' ? 'current' : 'upcoming';
        }

        return {
          sequence: idx + 1,
          stationCode: stop.stationCode,
          stationName: stop.stationName,
          scheduledArrival: stop.scheduledArrival,
          actualArrival: stop.actualArrival || null,
          delayMinutes: null,
          statusTag,
          platform: stop.platform || null,
        };
      });

  // Calculate usability display window (e.g., 2-3 completed, current, next 5-7)
  const windowSizeBefore = 3;
  const windowSizeAfter = 7;
  const startWindow = Math.max(0, derivedCurrentIdx - windowSizeBefore);
  const endWindow = Math.min(unifiedStops.length, derivedCurrentIdx + windowSizeAfter + 1);

  const shouldWindow = unifiedStops.length > 12 && !showFullRoute;
  const visibleStops = shouldWindow
    ? unifiedStops.slice(startWindow, endWindow)
    : unifiedStops;

  const hiddenBeforeCount = shouldWindow ? startWindow : 0;
  const hiddenAfterCount = shouldWindow ? unifiedStops.length - endWindow : 0;

  if (isTimelineUnavailable) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-xs text-center py-12">
        <h3 className="text-base font-bold text-slate-800">Station Timeline & Live Progress</h3>
        <p className="text-xs text-slate-500">Live route telemetry syncing from Railway Data Provider...</p>
        <span className="inline-block text-xs font-medium px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
          Route timeline temporarily unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Station Timeline & Live Progress</span>
            {isRealData && (
              <span className="text-[11px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md">
                Real Route Telemetry
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500">Live station arrivals, departures & status updates</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
            {actualTotalStops} Total Stops
          </span>

          {unifiedStops.length > 12 && (
            <button
              onClick={() => setShowFullRoute(!showFullRoute)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100 transition-colors"
            >
              <span>{showFullRoute ? 'Show windowed view' : `Show full route (${unifiedStops.length} stops)`}</span>
              {showFullRoute ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Indicator for hidden earlier stops */}
      {hiddenBeforeCount > 0 && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-between px-4">
          <span>... {hiddenBeforeCount} completed previous stops hidden</span>
          <button
            onClick={() => setShowFullRoute(true)}
            className="text-blue-600 hover:underline font-semibold"
          >
            Show full route
          </button>
        </div>
      )}

      {/* Timeline Stream */}
      <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {visibleStops.map((stop) => {
          let nodeIcon = <Circle className="w-5 h-5 text-slate-300 fill-white" aria-hidden="true" />;
          let statusText = 'Upcoming';
          let statusColor = 'text-slate-500';
          let borderHighlight = '';

          if (stop.statusTag === 'passed' || stop.statusTag === 'departed') {
            nodeIcon = <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" aria-hidden="true" />;
            statusText = stop.statusTag === 'departed' ? 'Departed' : 'Passed';
            statusColor = 'text-emerald-700 font-medium';
          } else if (stop.statusTag === 'current') {
            nodeIcon = (
              <div className="relative">
                <Radio className="w-5 h-5 text-blue-600 animate-pulse" aria-hidden="true" />
              </div>
            );
            statusText = 'Current Station';
            statusColor = 'text-blue-700 font-bold';
            borderHighlight = 'bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl -ml-3.5';
          } else if (stop.sequence === unifiedStops.length) {
            statusText = 'Destination';
            statusColor = 'text-slate-700 font-semibold';
          }

          return (
            <div key={`${stop.stationCode}-${stop.sequence}`} className={`relative flex items-start gap-4 ${borderHighlight}`}>
              {/* Timeline Marker Dot */}
              <div className="absolute -left-6 top-0.5 bg-white rounded-full">
                {nodeIcon}
              </div>

              {/* Content */}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-400">
                      #{stop.sequence}
                    </span>
                    <h4 className="text-base font-bold text-slate-900">
                      {stop.stationName}
                    </h4>
                    {stop.stationCode && (
                      <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {stop.stationCode}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs ${statusColor}`}>
                    {statusText}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-0.5">
                  {stop.scheduledArrival && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Sch: <strong>{stop.scheduledArrival}</strong></span>
                    </div>
                  )}
                  {stop.actualArrival && (
                    <div className="flex items-center gap-1">
                      <span>Exp/Act: <strong className="text-blue-800">{stop.actualArrival}</strong></span>
                    </div>
                  )}
                  {stop.delayMinutes !== null && stop.delayMinutes > 0 && (
                    <span className="text-rose-700 font-medium bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      +{stop.delayMinutes} m delay
                    </span>
                  )}
                  {stop.platform && (
                    <span className="text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                      PF: {stop.platform}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicator for hidden upcoming stops */}
      {hiddenAfterCount > 0 && (
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-between px-4">
          <span>... {hiddenAfterCount} remaining upcoming stops hidden</span>
          <button
            onClick={() => setShowFullRoute(true)}
            className="text-blue-600 hover:underline font-semibold"
          >
            Show full route
          </button>
        </div>
      )}
    </div>
  );
};
