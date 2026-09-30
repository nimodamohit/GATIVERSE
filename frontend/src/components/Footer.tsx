import React from 'react';
import Link from 'next/link';
import { Train, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2.5 text-white font-bold text-xl">
              <div className="p-2 bg-blue-600 text-white rounded-xl">
                <Train className="w-5 h-5" aria-hidden="true" />
              </div>
              <span>GATIVERSE</span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              AI-powered real-time railway platform providing live tracking, dynamic arrival predictions, and delay alerts for passengers.
            </p>
            <p className="text-xs text-slate-500 font-mono">
              &quot;Know Your Train. Know Your Time.&quot;
            </p>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-blue-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-blue-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500">
                  Search Trains
                </Link>
              </li>
              <li>
                <Link href="/journey-planner" className="hover:text-blue-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500">
                  Journey Planner
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-blue-400 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500">
                  Help & FAQs
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white text-sm font-semibold tracking-wider uppercase mb-4">Passenger Support</h3>
            <ul className="space-y-2.5 text-sm">
              <li className="text-slate-400">Railway Helpline: 139</li>
              <li className="text-slate-400">Support Availability: 24/7</li>
              <li className="text-slate-400">Pluggable Provider Architecture</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} GATIVERSE. Passenger Application Phase 1.</p>
          <p className="flex items-center gap-1">
            Built with accessibility <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for Railway Passengers
          </p>
        </div>
      </div>
    </footer>
  );
};
