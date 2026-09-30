'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RouteCard } from '@/components/RouteCard';
import { FeatureCard } from '@/components/FeatureCard';
import { TrainStatusCard } from '@/components/TrainStatusCard';
import { MOCK_POPULAR_ROUTES, MOCK_TRAINS, PopularRoute, getTrainByNumber } from '@/data/mockTrains';
import { getLastCheckedTrain, getRecentRoute, getRouteUsageMap } from '@/utils/storage';
import { Clock, Radio, Bell, Shuffle, ArrowRight, ShieldCheck, Sparkles, TrainTrack } from 'lucide-react';

export default function HomePage() {
  const [lastTrainNumber, setLastTrainNumber] = useState('12952');
  const [sampleTrain, setSampleTrain] = useState(MOCK_TRAINS[0]);
  const [displayRoutes, setDisplayRoutes] = useState<
    (PopularRoute & { isRecent?: boolean; visitCount?: number; badgeLabel?: string })[]
  >(MOCK_POPULAR_ROUTES);

  useEffect(() => {
    const savedTrainNum = getLastCheckedTrain();
    const foundTrain = getTrainByNumber(savedTrainNum) || MOCK_TRAINS[0];

    // Dynamic Popular Routes logic
    const recent = getRecentRoute();
    const usageMap = getRouteUsageMap();
    const combined: (PopularRoute & { isRecent?: boolean; visitCount?: number; badgeLabel?: string })[] = [];

    if (recent) {
      const existing = MOCK_POPULAR_ROUTES.find(
        (r) => r.from.toLowerCase() === recent.from.toLowerCase() && r.to.toLowerCase() === recent.to.toLowerCase()
      );
      const key = `${recent.from.toLowerCase()}__${recent.to.toLowerCase()}`;
      const usage = usageMap[key];

      combined.push({
        id: 'recent-route',
        from: recent.from,
        to: recent.to,
        fromCode: existing ? existing.fromCode : recent.from.slice(0, 4).toUpperCase(),
        toCode: existing ? existing.toCode : recent.to.slice(0, 4).toUpperCase(),
        popularTrainCount: existing ? existing.popularTrainCount : 12,
        avgDuration: existing ? existing.avgDuration : '8h 30m',
        isRecent: true,
        visitCount: usage ? usage.count : 1,
      });
    }

    const sortedUsageKeys = Object.keys(usageMap).sort((a, b) => usageMap[b].count - usageMap[a].count);
    for (const key of sortedUsageKeys) {
      const item = usageMap[key];
      if (recent && item.from.toLowerCase() === recent.from.toLowerCase() && item.to.toLowerCase() === recent.to.toLowerCase()) {
        continue;
      }
      const existing = MOCK_POPULAR_ROUTES.find(
        (r) => r.from.toLowerCase() === item.from.toLowerCase() && r.to.toLowerCase() === item.to.toLowerCase()
      );
      combined.push({
        id: `visited-${key}`,
        from: item.from,
        to: item.to,
        fromCode: existing ? existing.fromCode : item.from.slice(0, 4).toUpperCase(),
        toCode: existing ? existing.toCode : item.to.slice(0, 4).toUpperCase(),
        popularTrainCount: existing ? existing.popularTrainCount : 15,
        avgDuration: existing ? existing.avgDuration : '9h 15m',
        visitCount: item.count,
      });
    }

    for (const defaultRoute of MOCK_POPULAR_ROUTES) {
      if (combined.length >= 4) break;
      const isAlreadyIncluded = combined.some(
        (c) => c.from.toLowerCase() === defaultRoute.from.toLowerCase() && c.to.toLowerCase() === defaultRoute.to.toLowerCase()
      );
      if (!isAlreadyIncluded) {
        combined.push(defaultRoute);
      }
    }

    const finalRoutes = combined.slice(0, 4);

    const handle = requestAnimationFrame(() => {
      setLastTrainNumber(savedTrainNum);
      setSampleTrain(foundTrain);
      setDisplayRoutes(finalRoutes);
    });

    return () => cancelAnimationFrame(handle);
  }, []);


  return (
    <main className="space-y-16 py-8 md:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text & CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-800 border border-blue-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>AI-Powered Real-Time Passenger Intelligence</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Know Your Train.{' '}
              <span className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
                Know Your Time.
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
              Track your train, get dynamic arrival predictions, and stay informed about delays with high-accuracy live railway telemetry.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link
                href={`/train/${lastTrainNumber}`}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base rounded-xl shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
              >
                <span>Check Train Status</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>

              <Link
                href="/journey-planner"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-base rounded-xl border border-slate-300 transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                <span>Plan My Journey</span>
              </Link>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                Live Telemetry Tracking
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                AI ETA Prediction Model
              </span>
            </div>
          </div>

          {/* Right Visual Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 group">
              <Image
                src="/images/hero-train.jpg"
                alt="Indian Railway Passenger Express Train"
                width={700}
                height={420}
                className="w-full h-80 sm:h-96 object-cover transform group-hover:scale-105 transition-transform duration-700"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent p-6 sm:p-8 flex flex-col justify-end text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-200 text-xs font-mono">
                    <TrainTrack className="w-4 h-4 text-blue-400" />
                    <span>LIVE EXPRESS FEED</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active Telemetry
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">
                    {sampleTrain.trainNumber} {sampleTrain.trainName}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-200">
                    {sampleTrain.source} ({sampleTrain.sourceCode}) → {sampleTrain.destination} ({sampleTrain.destinationCode})
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 space-y-2 border border-white/15">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-200">Current Station:</span>
                    <span className="font-bold text-white">{sampleTrain.currentStation}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-200">Expected Arrival:</span>
                    <span className="font-bold text-amber-300 text-sm">
                      {sampleTrain.stations.find((s) => s.status === 'current')?.actualArrival || sampleTrain.arrivalTime} (+{sampleTrain.delayMinutes}m delay)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Train Status Preview Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Live Train Status Preview
          </h2>
          <p className="text-sm text-slate-600">
            Clear visual hierarchy showing predicted arrival, status, and current location at a glance.
          </p>
        </div>

        <TrainStatusCard train={sampleTrain} />
      </section>

      {/* Popular Routes Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Popular Routes
            </h2>
            <p className="text-sm text-slate-500">
              Quick access to frequently traveled railway corridors
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span>View All Routes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayRoutes.map((route) => (
            <RouteCard
              key={route.id}
              route={route}
              isRecent={route.isRecent}
              visitCount={route.visitCount}
              badgeLabel={route.badgeLabel}
            />
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Designed for Passenger Peace of Mind
          </h2>
          <p className="text-sm text-slate-600">
            Intelligent features built to keep you informed before and during your railway journey.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            title="Dynamic ETA"
            description="Get updated arrival predictions as train conditions, signals, and speeds change."
            icon={Clock}
            iconBgColor="bg-blue-100"
            iconTextColor="text-blue-700"
          />
          <FeatureCard
            title="Live Train Status"
            description="See the exact current train location, speed, and next upcoming station."
            icon={Radio}
            iconBgColor="bg-emerald-100"
            iconTextColor="text-emerald-700"
          />
          <FeatureCard
            title="Delay Alerts"
            description="Know immediately when weather, track work, or delays affect your journey."
            icon={Bell}
            iconBgColor="bg-amber-100"
            iconTextColor="text-amber-800"
          />
          <FeatureCard
            title="Alternative Trains"
            description="Find other suitable train options quickly whenever your journey is disrupted."
            icon={Shuffle}
            iconBgColor="bg-purple-100"
            iconTextColor="text-purple-700"
          />
        </div>
      </section>
    </main>
  );
}

