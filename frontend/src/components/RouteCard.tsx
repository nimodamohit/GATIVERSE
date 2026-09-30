import React from 'react';
import Link from 'next/link';
import { PopularRoute } from '@/data/mockTrains';
import { ArrowRight, Train, History, Sparkles } from 'lucide-react';

interface RouteCardProps {
  route: PopularRoute;
  isRecent?: boolean;
  visitCount?: number;
  badgeLabel?: string;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isRecent,
  visitCount,
  badgeLabel,
}) => {
  let badge = (
    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
      {route.popularTrainCount} Daily Trains
    </span>
  );

  if (isRecent) {
    badge = (
      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1">
        <History className="w-3 h-3 text-blue-600" />
        <span>Recent Route</span>
      </span>
    );
  } else if (visitCount && visitCount > 0) {
    badge = (
      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-indigo-600" />
        <span>{visitCount} Visits</span>
      </span>
    );
  } else if (badgeLabel) {
    badge = (
      <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
        {badgeLabel}
      </span>
    );
  }

  return (
    <Link
      href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}`}
      className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between space-y-4 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
        isRecent ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300'
      }`}
      aria-label={`View trains from ${route.from} to ${route.to}`}
    >
      <div className="flex items-center justify-between">
        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
          <Train className="w-4 h-4" aria-hidden="true" />
        </div>
        {badge}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base group-hover:text-blue-700 transition-colors">
          <span>{route.from}</span>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          <span>{route.to}</span>
        </div>
        <p className="text-xs text-slate-500">
          Average duration: <strong className="text-slate-700">{route.avgDuration}</strong>
        </p>
      </div>
    </Link>
  );
};

