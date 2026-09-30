'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { recordRouteUsage } from '@/utils/storage';
import { StationOption } from '@/types/search';
import { Search, MapPin, Calendar, Hash } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface TrainSearchProps {
  initialFrom?: string;
  initialTo?: string;
  initialDate?: string;
  initialTrainNumber?: string;
}

export const TrainSearch: React.FC<TrainSearchProps> = ({
  initialFrom = '',
  initialTo = '',
  initialDate = '',
  initialTrainNumber = '',
}) => {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [date, setDate] = useState(initialDate);
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber);

  const [fromSuggestions, setFromSuggestions] = useState<StationOption[]>([]);
  const [toSuggestions, setToSuggestions] = useState<StationOption[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setShowToDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStations = async (query: string, setFn: React.Dispatch<React.SetStateAction<StationOption[]>>) => {
    if (!query.trim() || query.trim().length < 2) {
      setFn([]);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/trains/stations/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setFn(json.data);
        }
      }
    } catch {
      setFn([]);
    }
  };

  const handleFromChange = (val: string) => {
    setFrom(val);
    setShowFromDropdown(true);
    fetchStations(val, setFromSuggestions);
  };

  const handleToChange = (val: string) => {
    setTo(val);
    setShowToDropdown(true);
    fetchStations(val, setToSuggestions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trainNumber.trim()) {
      router.push(`/train/${encodeURIComponent(trainNumber.trim())}`);
      return;
    }

    if (from.trim() && to.trim()) {
      recordRouteUsage(from.trim(), to.trim());
    }

    const params = new URLSearchParams();
    if (from.trim()) params.set('from', from.trim());
    if (to.trim()) params.set('to', to.trim());
    if (date.trim()) params.set('date', date.trim());

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8 max-w-4xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl">
          <Search className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Find Your Train
          </h2>
          <p className="text-sm text-slate-500">
            Search real Indian Railways timetables, live status, and delay information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* From Station */}
          <div className="space-y-1.5 relative" ref={fromRef}>
            <label htmlFor="search-from" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              From Station
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="search-from"
                type="text"
                value={from}
                onChange={(e) => handleFromChange(e.target.value)}
                onFocus={() => {
                  setShowFromDropdown(true);
                  fetchStations(from, setFromSuggestions);
                }}
                placeholder="e.g. Bhopal (BPL)"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {showFromDropdown && fromSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {fromSuggestions.map((st) => (
                  <button
                    key={`${st.code}-${st.name}`}
                    type="button"
                    onClick={() => {
                      setFrom(`${st.name} (${st.code})`);
                      setShowFromDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-900">{st.name}</span>
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">{st.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To Station */}
          <div className="space-y-1.5 relative" ref={toRef}>
            <label htmlFor="search-to" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              To Station
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </div>
              <input
                id="search-to"
                type="text"
                value={to}
                onChange={(e) => handleToChange(e.target.value)}
                onFocus={() => {
                  setShowToDropdown(true);
                  fetchStations(to, setToSuggestions);
                }}
                placeholder="e.g. Delhi (NDLS)"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>

            {/* Autocomplete Dropdown */}
            {showToDropdown && toSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                {toSuggestions.map((st) => (
                  <button
                    key={`${st.code}-${st.name}`}
                    type="button"
                    onClick={() => {
                      setTo(`${st.name} (${st.code})`);
                      setShowToDropdown(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-blue-50 flex items-center justify-between transition-colors"
                  >
                    <span className="font-medium text-slate-900">{st.name}</span>
                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">{st.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Travel Date */}
          <div className="space-y-1.5">
            <label htmlFor="search-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Travel Date
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="search-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Train Number (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="search-train-num" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Train Number <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="search-train-num"
                type="text"
                value={trainNumber}
                onChange={(e) => setTrainNumber(e.target.value)}
                placeholder="e.g. 12952"
                className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 cursor-pointer"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>Search Real Trains</span>
          </button>
        </div>
      </form>
    </div>
  );
};


