'use client';

import React from 'react';
import { NormalizedSearchTrain } from '@/types/search';
import { X, Ticket, ShieldCheck, MapPin, ArrowRight, ExternalLink } from 'lucide-react';

interface DemoBookingModalProps {
  train: NormalizedSearchTrain;
  selectedClass: string;
  journeyDate: string;
  fare: number | null;
  onClose: () => void;
}

export const DemoBookingModal: React.FC<DemoBookingModalProps> = ({
  train,
  selectedClass,
  journeyDate,
  fare,
  onClose,
}) => {
  const handleRedirectToIrctc = () => {
    window.open('https://www.irctc.co.in', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
              <Ticket className="w-4 h-4 text-blue-400" />
              <span>BOOKING INTEGRATION</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Book Ticket: {train.trainNumber} {train.trainName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Journey Summary */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
              <span>{train.trainNumber} {train.trainName}</span>
              <span className="text-blue-700 font-mono">{journeyDate}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{train.from.name} ({train.from.code})</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span>{train.to.name} ({train.to.code})</span>
            </div>
            <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs">
              <span>Class: <strong>{selectedClass}</strong></span>
              <span>Total Fare: <strong>{fare !== null ? `₹${fare.toLocaleString('en-IN')}` : 'Fare unavailable'}</strong></span>
            </div>
          </div>

          {/* Booking Notice Card */}
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-950">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0" />
              <span>Booking Integration Not Available</span>
            </div>
            <p className="text-amber-900 leading-relaxed">
              GATIVERSE provides verified live railway telemetry, seat availability, and fare lookups. Direct ticket booking requires official IRCTC commercial authorization.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleRedirectToIrctc}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
            >
              <span>Continue to Official IRCTC Booking</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

