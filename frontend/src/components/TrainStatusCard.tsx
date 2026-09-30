'use client';

import React from 'react';
import Link from 'next/link';
import { TrainDetails } from '@/data/mockTrains';
import { StatusBadge } from './StatusBadge';
import { setLastCheckedTrain } from '@/utils/storage';
import { ArrowRight, MapPin, Navigation, Clock } from 'lucide-react';

interface TrainStatusCardProps {
  train: TrainDetails;
}

export const TrainStatusCard: React.FC<TrainStatusCardProps> = ({ train }) => {
  // Find current & next station expected times
  const currentStop = train.stations.find((s) => s.status === 'current') || train.stations[0];
  const nextStop = train.stations.find((s) => s.status === 'upcoming') || train.stations[train.stations.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden max-w-2xl w-full mx-auto">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600 font-mono font-bold text-sm rounded-lg text-white">
              {train.trainNumber}
            </span>
            <h3 className="text-xl font-bold tracking-tight">
              {train.trainName}
            </h3>
          </div>
          <StatusBadge status={train.currentStatus} delayMinutes={train.delayMinutes} size="md" />
        </div>

        <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
          <span>{train.source}</span>
          <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>{train.destination}</span>
        </div>
      </div>

      {/* Main Status Grid */}
      <div className="p-6 space-y-6">
        {/* Highlighted Expected Arrival & Delay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Expected Arrival (ETA)
            </span>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-900">
              {currentStop.actualArrival || train.arrivalTime}
            </div>
            <p className="text-xs text-slate-500">
              Scheduled: <span className="line-through">{currentStop.scheduledArrival}</span>
            </p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Current Delay Status
            </span>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-700">
              +{train.delayMinutes} min delay
            </div>
            <p className="text-xs text-slate-500">
              Updated {train.lastUpdated}
            </p>
          </div>
        </div>

        {/* Location & Station Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0">
              <MapPin className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Current Location</span>
              <strong className="text-slate-900 text-sm">{train.currentStation}</strong>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
              <Navigation className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block font-medium">Next Station</span>
              <strong className="text-slate-900 text-sm">{nextStop.stationName}</strong>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href={`/train/${train.trainNumber}`}
            onClick={() => setLastCheckedTrain(train.trainNumber)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <span>View Complete Train Schedule & Live Status</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

