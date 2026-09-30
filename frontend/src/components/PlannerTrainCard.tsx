'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { NormalizedSearchTrain } from '@/types/search';
import { ArrowRight, Ticket, Eye, ShieldCheck, Tag, ChevronDown, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export interface AvailabilityCalendarItem {
  date: string;
  status: string | null;
  statusCode?: string | null;
  isAvailable?: boolean;
  availableSeats?: number;
  waitlistNumber?: number;
}

export interface FareBreakdown {
  baseFare: number;
  reservationCharge: number;
  superfastCharge: number;
  tatkalFare: number;
  goodsServiceTax: number;
  cateringCharge: number;
  dynamicFare: number;
  otherCharge: number;
  totalFare: number;
}

interface PlannerTrainCardProps {
  train: NormalizedSearchTrain;
  journeyDate: string;
  onBookTicket: (train: NormalizedSearchTrain, selectedClass: string, fare: number | null) => void;
}

const CLASS_OPTIONS = [
  { code: '3A', name: 'AC 3 Tier' },
  { code: '2A', name: 'AC 2 Tier' },
  { code: '1A', name: 'AC First Class' },
  { code: '3E', name: 'AC 3 Economy' },
  { code: 'CC', name: 'AC Chair Car' },
  { code: 'EC', name: 'Executive Chair' },
  { code: 'SL', name: 'Sleeper Class' },
  { code: '2S', name: 'Second Seating' },
];

const QUOTA_OPTIONS = [
  { code: 'GN', name: 'General Quota' },
  { code: 'TQ', name: 'Tatkal Quota' },
  { code: 'LD', name: 'Ladies Quota' },
  { code: 'PT', name: 'Premium Tatkal' },
];

export const PlannerTrainCard: React.FC<PlannerTrainCardProps> = ({ train, journeyDate, onBookTicket }) => {
  const [selectedClass, setSelectedClass] = useState<string>('3A');
  const [selectedQuota, setSelectedQuota] = useState<string>('GN');

  // Availability states
  const [availCalendar, setAvailCalendar] = useState<AvailabilityCalendarItem[]>([]);
  const [isAvailLoading, setIsAvailLoading] = useState<boolean>(false);
  const [availError, setAvailError] = useState<string | null>(null);

  // Fare states
  const [totalFare, setTotalFare] = useState<number | null>(null);
  const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);
  const [isFareLoading, setIsFareLoading] = useState<boolean>(false);
  const [fareError, setFareError] = useState<string | null>(null);
  const [showFareBreakdown, setShowFareBreakdown] = useState<boolean>(false);

  // Fetch seat availability & fare whenever class or quota changes
  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      setIsAvailLoading(true);
      setIsFareLoading(true);
      setAvailError(null);
      setFareError(null);

      const params = new URLSearchParams({
        from: train.from.code,
        to: train.to.code,
        date: journeyDate,
        class: selectedClass,
        quota: selectedQuota,
      });

      // 1. Fetch Availability
      try {
        const resAvail = await fetch(`${BACKEND_URL}/api/trains/${train.trainNumber}/availability?${params.toString()}`);
        if (!isMounted) return;

        if (resAvail.ok) {
          const json = await resAvail.json();
          if (json.success && json.data && Array.isArray(json.data.availability)) {
            setAvailCalendar(json.data.availability);
          } else {
            setAvailError('Seat availability data unavailable');
            setAvailCalendar([]);
          }
        } else {
          setAvailError('Seat availability temporarily unavailable');
          setAvailCalendar([]);
        }
      } catch {
        if (!isMounted) return;
        setAvailError('Seat availability temporarily unavailable');
        setAvailCalendar([]);
      } finally {
        if (isMounted) setIsAvailLoading(false);
      }

      // 2. Fetch Fare
      try {
        const resFare = await fetch(`${BACKEND_URL}/api/trains/${train.trainNumber}/fare?${params.toString()}`);
        if (!isMounted) return;

        if (resFare.ok) {
          const json = await resFare.json();
          if (json.success && json.data && typeof json.data.totalFare === 'number') {
            setTotalFare(json.data.totalFare);
            setFareBreakdown(json.data.breakdown || null);
          } else {
            setTotalFare(null);
            setFareBreakdown(null);
            setFareError('Fare unavailable');
          }
        } else {
          setTotalFare(null);
          setFareBreakdown(null);
          setFareError('Fare unavailable');
        }
      } catch {
        if (!isMounted) return;
        setTotalFare(null);
        setFareBreakdown(null);
        setFareError('Fare unavailable');
      } finally {
        if (isMounted) setIsFareLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [train.trainNumber, train.from.code, train.to.code, journeyDate, selectedClass, selectedQuota]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-blue-100 text-blue-900 font-mono font-bold text-sm rounded-lg">
              {train.trainNumber}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{train.trainName}</h3>
            {train.trainType && (
              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-medium text-xs rounded-md flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" />
                {train.trainType}
              </span>
            )}
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>🟢 REAL RAILWAY DATA</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium pt-0.5">
            <span className="font-semibold text-slate-900">{train.from.name}</span>
            <span className="text-slate-400 font-mono">({train.from.code})</span>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-slate-900">{train.to.name}</span>
            <span className="text-slate-400 font-mono">({train.to.code})</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div>
            <span className="block text-slate-400 font-medium">Departs</span>
            <strong className="text-slate-900 text-sm">{train.from.departure || '--:--'}</strong>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="block text-slate-400 font-medium">Arrives</span>
            <strong className="text-slate-900 text-sm">{train.to.arrival || '--:--'}</strong>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="block text-slate-400 font-medium">Duration</span>
            <strong className="text-slate-900 text-sm">{train.duration || '--'}</strong>
          </div>
        </div>
      </div>

      {/* Class & Quota Selectors */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Select Class & Quota:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quota Dropdown */}
            <div className="relative">
              <select
                value={selectedQuota}
                onChange={(e) => setSelectedQuota(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                {QUOTA_OPTIONS.map((q) => (
                  <option key={q.code} value={q.code}>{q.name} ({q.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Class Selection Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {CLASS_OPTIONS.map((cls) => {
            const isSelected = selectedClass === cls.code;
            return (
              <button
                key={cls.code}
                type="button"
                onClick={() => setSelectedClass(cls.code)}
                className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">{cls.code}</div>
                <div className="text-[10px] opacity-80 truncate">{cls.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seat Availability Calendar Grid */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
          <span>Real Seat Availability ({selectedClass} - {selectedQuota})</span>
          {isAvailLoading && <span className="text-blue-600 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Fetching PRS...</span>}
        </div>

        {isAvailLoading ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 animate-pulse">
            Loading seat availability from RailRadar...
          </div>
        ) : availError ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
            <span className="font-medium">⚪ DATA NOT AVAILABLE ({availError})</span>
          </div>
        ) : availCalendar.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {availCalendar.slice(0, 7).map((cal) => {
              const isAvail = cal.isAvailable;
              const isRAC = (cal.statusCode || cal.status || '').toUpperCase().includes('RAC');

              return (
                <div
                  key={cal.date}
                  className={`p-2.5 rounded-xl border text-left text-xs ${
                    isAvail
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : isRAC
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="font-bold text-[11px] text-slate-700">{cal.date}</div>
                  <div className="font-bold text-xs mt-0.5 truncate">{cal.status || 'AVAILABLE'}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            ⚪ DATA NOT AVAILABLE
          </div>
        )}
      </div>

      {/* Fare Card & Action Bar */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Total Fare:</span>
            {isFareLoading ? (
              <span className="text-xs text-blue-600 animate-pulse">Checking fare...</span>
            ) : totalFare !== null ? (
              <strong className="text-blue-900 font-extrabold text-lg">₹{totalFare.toLocaleString('en-IN')}</strong>
            ) : (
              <span className="text-xs font-bold text-slate-600">{fareError || 'Fare unavailable'}</span>
            )}

            {fareBreakdown && (
              <button
                type="button"
                onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                className="text-[11px] font-semibold text-blue-700 underline flex items-center gap-0.5 cursor-pointer ml-1"
              >
                <span>Breakdown</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFareBreakdown ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Selected Class: <strong className="text-slate-800">{selectedClass}</strong> • Quota: <strong className="text-slate-800">{selectedQuota}</strong>
          </p>

          {/* Breakdown Modal / Overlay */}
          {showFareBreakdown && fareBreakdown && (
            <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 text-slate-700 shadow-xs">
              <div className="flex justify-between"><span>Base Fare:</span><strong>₹{fareBreakdown.baseFare}</strong></div>
              {fareBreakdown.reservationCharge > 0 && <div className="flex justify-between"><span>Reservation Fee:</span><strong>₹{fareBreakdown.reservationCharge}</strong></div>}
              {fareBreakdown.superfastCharge > 0 && <div className="flex justify-between"><span>Superfast Charge:</span><strong>₹{fareBreakdown.superfastCharge}</strong></div>}
              {fareBreakdown.goodsServiceTax > 0 && <div className="flex justify-between"><span>GST:</span><strong>₹{fareBreakdown.goodsServiceTax}</strong></div>}
              {fareBreakdown.cateringCharge > 0 && <div className="flex justify-between"><span>Catering Charge:</span><strong>₹{fareBreakdown.cateringCharge}</strong></div>}
              {fareBreakdown.dynamicFare > 0 && <div className="flex justify-between"><span>Dynamic Fare:</span><strong>₹{fareBreakdown.dynamicFare}</strong></div>}
              <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900"><span>Total:</span><strong>₹{fareBreakdown.totalFare}</strong></div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Live Status Link */}
          <Link
            href={`/train/${train.trainNumber}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Status</span>
          </Link>

          {/* Book Ticket Button */}
          <button
            type="button"
            onClick={() => onBookTicket(train, selectedClass, totalFare)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Ticket className="w-4 h-4" aria-hidden="true" />
            <span>Book Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};

