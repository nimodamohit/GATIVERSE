'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrainSearch } from '@/components/TrainSearch';
import { TrainCard } from '@/components/TrainCard';
import { LoadingState } from '@/components/LoadingState';
import { recordRouteUsage } from '@/utils/storage';
import { NormalizedSearchTrain } from '@/types/search';
import { Train, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const date = searchParams.get('date') || '';
  const trainNumber = searchParams.get('trainNumber') || '';

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<NormalizedSearchTrain[]>([]);

  useEffect(() => {
    let isMounted = true;

    const executeSearch = async () => {
      setLoading(true);
      setError(null);

      const src = from.trim() || 'BPL';
      const dst = to.trim() || 'NDLS';

      if (from.trim() && to.trim()) {
        recordRouteUsage(from.trim(), to.trim());
      }

      try {
        const queryParams = new URLSearchParams({
          from: src,
          to: dst,
          live: 'true',
        });
        if (date.trim()) queryParams.set('date', date.trim());

        const res = await fetch(`${BACKEND_URL}/api/trains/search?${queryParams.toString()}`);
        if (!isMounted) return;

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setResults(json.data);
            setError(null);
          } else {
            setError(json.error?.message || 'Real railway search is temporarily unavailable.');
            setResults([]);
          }
        } else {
          const json = await res.json().catch(() => ({}));
          if (res.status === 429) {
            setError('Rate limit reached. Please try again in a few moments.');
          } else if (res.status === 400) {
            setError('Invalid station selected. Please check origin and destination.');
          } else {
            setError(json.error?.message || 'Real railway search is temporarily unavailable.');
          }
          setResults([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Real train search fetch error:', err);
        setError('Real railway search is temporarily unavailable.');
        setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    executeSearch();

    return () => {
      isMounted = false;
    };
  }, [from, to, date, trainNumber]);

  return (
    <div className="space-y-8">
      {/* Search Form Section */}
      <TrainSearch
        initialFrom={from}
        initialTo={to}
        initialDate={date}
        initialTrainNumber={trainNumber}
      />

      {/* Active Search Filters & Results Summary */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Train className="w-6 h-6 text-blue-600" aria-hidden="true" />
                <span>Available Real Trains</span>
              </h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>REAL RAILWAY DATA</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {loading ? (
                <span>Querying live railway data...</span>
              ) : (
                <span>Showing <strong className="text-slate-900">{results.length}</strong> real trains</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-medium">
              From: {from.trim() || 'BPL'}
            </span>
            <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg font-medium">
              To: {to.trim() || 'NDLS'}
            </span>
            {date && (
              <span className="px-3 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg font-medium">
                Date: {date}
              </span>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12">
            <LoadingState message="Searching real Indian Railways database..." />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4 max-w-lg mx-auto shadow-xs">
            <div className="p-3.5 bg-red-50 text-red-600 rounded-full inline-block">
              <AlertCircle className="w-8 h-8" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Search Unavailable</h2>
            <p className="text-sm text-slate-600 font-medium">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Search</span>
            </button>
          </div>
        )}

        {/* Train Cards List */}
        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((train) => (
              <TrainCard key={`${train.trainNumber}-${train.from.code}-${train.to.code}`} train={train} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 max-w-lg mx-auto">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-full inline-block">
              <AlertCircle className="w-8 h-8" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No Trains Found</h2>
            <p className="text-sm text-slate-600">
              We couldn&apos;t find any real trains running between the selected stations. Try choosing major junction codes like BPL, NDLS, MMCT, or INDB.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<LoadingState message="Searching real trains..." />}>
        <SearchResultsContent />
      </Suspense>
    </main>
  );
}


