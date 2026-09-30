'use client';

import React from 'react';
import Link from 'next/link';
import { TrainDetails } from '@/data/mockTrains';
import { NormalizedSearchTrain } from '@/types/search';
import { StatusBadge } from './StatusBadge';
import { setLastCheckedTrain } from '@/utils/storage';
import { ArrowRight, Clock, MapPin, Gauge, ShieldCheck, Tag } from 'lucide-react';

interface TrainCardProps {
  train: TrainDetails | NormalizedSearchTrain;
}

export const TrainCard: React.FC<TrainCardProps> = ({ train }) => {
  const isNormalized = 'from' in train && typeof train.from === 'object';

  if (isNormalized) {
    const norm = train as NormalizedSearchTrain;
    const isReal = norm.dataSource === 'real' || norm.dataSource === 'railkit';

    let statusType: 'On Time' | 'Delayed' | 'Early' | 'Cancelled' = 'On Time';
    const rawStatus = (norm.live?.status || '').toLowerCase();
    const delay = norm.live?.delayMinutes ?? 0;

    if (rawStatus.includes('cancel')) statusType = 'Cancelled';
    else if (delay > 5 || rawStatus.includes('delay')) statusType = 'Delayed';

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Train Identification & Route */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-900 font-mono font-bold text-sm rounded-lg">
              {norm.trainNumber}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {norm.trainName}
            </h3>
            {norm.trainType && (
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-medium text-xs rounded-md flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                {norm.trainType}
              </span>
            )}
            <StatusBadge status={statusType} delayMinutes={delay} size="sm" />
            
            {/* Real Data Badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
              isReal ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <ShieldCheck className="w-3 h-3" />
              <span>{isReal ? '🟢 REAL RAILWAY DATA' : 'SIMULATOR'}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-700 text-sm font-medium">
            <span className="font-semibold text-slate-900">{norm.from.name}</span>
            <span className="text-slate-400 font-mono">({norm.from.code})</span>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-slate-900">{norm.to.name}</span>
            <span className="text-slate-400 font-mono">({norm.to.code})</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            {norm.from.departure && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Departure: <strong className="text-slate-700">{norm.from.departure}</strong></span>
              </div>
            )}
            {norm.to.arrival && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                <span>Arrival: <strong className="text-slate-700">{norm.to.arrival}</strong></span>
              </div>
            )}
            {norm.duration && (
              <div className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-medium">Duration: {norm.duration}</span>
              </div>
            )}
            {norm.distance && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{norm.distance} km</span>
              </div>
            )}
            {norm.totalHalts !== null && (
              <div className="flex items-center gap-1">
                <span className="text-slate-500">{norm.totalHalts} halts</span>
              </div>
            )}
          </div>

          {/* Live Status Info */}
          {norm.live && (
            <div className="flex items-center gap-4 pt-1 text-xs text-slate-600 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span>Live Status: <strong className="text-slate-800 capitalize">{norm.live.status || 'Scheduled'}</strong></span>
              </div>
              {norm.live.platform && (
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium">Platform {norm.live.platform}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="shrink-0 flex items-center md:flex-col justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          <Link
            href={`/train/${norm.trainNumber}`}
            onClick={() => setLastCheckedTrain(norm.trainNumber)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            aria-label={`View live status for train ${norm.trainNumber} ${norm.trainName}`}
          >
            <span>View Live Status</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  // Legacy TrainDetails rendering
  const legacy = train as TrainDetails;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="space-y-3 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 bg-blue-100 text-blue-900 font-mono font-bold text-sm rounded-lg">
            {legacy.trainNumber}
          </span>
          <h3 className="text-lg font-bold text-slate-900">
            {legacy.trainName}
          </h3>
          <StatusBadge status={legacy.currentStatus} delayMinutes={legacy.delayMinutes} size="sm" />
        </div>

        <div className="flex items-center gap-3 text-slate-700 text-sm font-medium">
          <span className="font-semibold text-slate-900">{legacy.source}</span>
          <span className="text-slate-400 font-mono">({legacy.sourceCode})</span>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-slate-900">{legacy.destination}</span>
          <span className="text-slate-400 font-mono">({legacy.destinationCode})</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Departure: <strong className="text-slate-700">{legacy.departureTime}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Arrival: <strong className="text-slate-700">{legacy.arrivalTime}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 font-medium">Duration: {legacy.duration}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1 text-xs text-slate-600 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>Current: <strong className="text-slate-800">{legacy.currentStation}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Speed: <strong className="text-slate-800">{legacy.currentSpeedKmH} km/h</strong></span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center md:flex-col justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
        <Link
          href={`/train/${legacy.trainNumber}`}
          onClick={() => setLastCheckedTrain(legacy.trainNumber)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          aria-label={`View live status for train ${legacy.trainNumber} ${legacy.trainName}`}
        >
          <span>View Live Status</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};


