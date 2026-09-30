'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlannerTrainCard } from '@/components/PlannerTrainCard';
import { DemoBookingModal } from '@/components/DemoBookingModal';
import { NormalizedSearchTrain } from '@/types/search';
import {
  getLastJourneySearch,
  setLastJourneySearch,
  recordRouteUsage,
} from '@/utils/storage';
import {
  MapPin,
  Calendar,
  Compass,
  Search,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function JourneyPlannerContent() {
  const searchParams = useSearchParams();

  // Search form states
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');

  // UI & results states
  const [trains, setTrains] = useState<NormalizedSearchTrain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Booking Modal State
  const [bookingModalData, setBookingModalData] = useState<{
    train: NormalizedSearchTrain;
    selectedClass: string;
    fare: number | null;
  } | null>(null);

  // Execute Search against real backend search API
  const performSearch = useCallback(async (searchFrom: string, searchTo: string, searchDate: string) => {
    const cleanFrom = searchFrom.trim();
    const cleanTo = searchTo.trim();

    if (!cleanFrom) {
      setErrorMessage('Please enter an origin station (From)');
      return;
    }
    if (!cleanTo) {
      setErrorMessage('Please enter a destination station (To)');
      return;
    }
    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setErrorMessage('Origin and destination cannot be the same station');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setIsSearched(true);

    setLastJourneySearch({
      from: cleanFrom,
      to: cleanTo,
      date: searchDate,
      classType: 'ALL',
    });
    recordRouteUsage(cleanFrom, cleanTo);

    try {
      const url = `${BACKEND_URL}/api/trains/search?from=${encodeURIComponent(cleanFrom)}&to=${encodeURIComponent(cleanTo)}&date=${encodeURIComponent(searchDate)}&live=true`;

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.success && Array.isArray(data.data)) {
        setTrains(data.data);
      } else {
        const msg = data?.error?.message || 'No matching real trains found for this route.';
        setErrorMessage(msg);
        setTrains([]);
      }
    } catch {
      setErrorMessage('Real train search service is temporarily unavailable. Please check your connection.');
      setTrains([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize from URL params or Local Storage
  useEffect(() => {
    const urlFrom = searchParams.get('from');
    const urlTo = searchParams.get('to');
    const urlDate = searchParams.get('date');

    const lastSearch = getLastJourneySearch();

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDateStr = tomorrow.toISOString().split('T')[0];

    const initialFrom = urlFrom || lastSearch?.from || 'BPL';
    const initialTo = urlTo || lastSearch?.to || 'NDLS';
    const initialDate = urlDate || lastSearch?.date || defaultDateStr;

    const handle = requestAnimationFrame(() => {
      setFrom(initialFrom);
      setTo(initialTo);
      setDate(initialDate);

      if (initialFrom && initialTo) {
        performSearch(initialFrom, initialTo, initialDate);
      }
    });

    return () => cancelAnimationFrame(handle);
  }, [searchParams, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(from, to, date);
  };

  const handleOpenBooking = (train: NormalizedSearchTrain, selectedClass: string, fare: number | null) => {
    setBookingModalData({ train, selectedClass, fare });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="space-y-2 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
          <Compass className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          <span>Real Journey Planner & Seat Availability</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Plan Your Railway Journey
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Search real express timetables from RailRadar, check live seat availability, and view official ticket fare breakdowns.
        </p>
      </div>

      {/* Main Search Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Origin (From) */}
            <div className="space-y-1.5">
              <label htmlFor="planner-from" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                From Station *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="planner-from"
                  type="text"
                  required
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="e.g. Bhopal (BPL)"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Destination (To) */}
            <div className="space-y-1.5">
              <label htmlFor="planner-to" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                To Station *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="planner-to"
                  type="text"
                  required
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="e.g. Delhi (NDLS)"
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all"
                />
              </div>
            </div>

            {/* Journey Date */}
            <div className="space-y-1.5">
              <label htmlFor="planner-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Journey Date *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="planner-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Validation / Error Message Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Search CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                🟢 REAL RAILWAY DATA
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                Live PRS Availability & Fare
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-xl shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Searching Real Trains...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" aria-hidden="true" />
                  <span>Search Real Trains</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {isSearched && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-0.5">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <span>Available Real Trains ({trains.length})</span>
              </h2>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>{from}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{to}</span>
                <span>• Date: {date}</span>
              </p>
            </div>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 bg-white rounded-2xl border border-slate-200 animate-pulse space-y-4">
                  <div className="h-5 bg-slate-200 rounded-md w-1/3" />
                  <div className="h-4 bg-slate-100 rounded-md w-1/2" />
                  <div className="grid grid-cols-4 gap-3 pt-2">
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : trains.length > 0 ? (
            <div className="space-y-4">
              {trains.map((train) => (
                <PlannerTrainCard
                  key={`${train.trainNumber}-${train.from.code}-${train.to.code}`}
                  train={train}
                  journeyDate={date}
                  onBookTicket={handleOpenBooking}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                No real trains found for this route and date.
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Try searching with station junction codes (e.g. BPL, NDLS, MMCT, INDB).
              </p>
            </div>
          )}
        </div>
      )}

      {/* Booking Integration Notice Modal */}
      {bookingModalData && (
        <DemoBookingModal
          train={bookingModalData.train}
          selectedClass={bookingModalData.selectedClass}
          journeyDate={date}
          fare={bookingModalData.fare}
          onClose={() => setBookingModalData(null)}
        />
      )}
    </main>
  );
}

export default function JourneyPlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading Real Journey Planner...</p>
        </div>
      }
    >
      <JourneyPlannerContent />
    </Suspense>
  );
}


