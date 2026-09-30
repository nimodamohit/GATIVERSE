import React from 'react';
import { HelpCircle, Clock, Radio, Shuffle, AlertCircle } from 'lucide-react';

export default function HelpPage() {
  const faqs = [
    {
      id: 'faq-1',
      question: 'How does GATIVERSE work?',
      answer:
        'GATIVERSE combines live telemetry data from railway signals, station departure logs, and machine learning models to dynamically calculate predicted arrival times instead of relying solely on static schedules.',
      icon: Radio,
    },
    {
      id: 'faq-2',
      question: 'What does predicted arrival mean?',
      answer:
        'Predicted Arrival (ETA) is the estimated time your train will reach a station based on current track speeds, recent delays, and route conditions, giving you a realistic arrival estimate.',
      icon: Clock,
    },
    {
      id: 'faq-3',
      question: 'Why can the ETA change?',
      answer:
        'Train ETAs update continuously in real time. Unexpected track maintenance, platform clearance holds, weather conditions, or speed adjustments along the corridor cause the prediction engine to refine the ETA.',
      icon: HelpCircle,
    },
    {
      id: 'faq-4',
      question: 'How are delays shown?',
      answer:
        'Delays are shown with explicit text badges (e.g. "+35 min delay") alongside color badges and clock icons so passengers can immediately distinguish on-time trains from delayed ones without relying solely on color.',
      icon: AlertCircle,
    },
    {
      id: 'faq-5',
      question: 'Can I find alternative trains?',
      answer:
        'Yes. If your scheduled train is severely delayed or cancelled, GATIVERSE provides alternative train suggestions on the route so you can complete your journey on time.',
      icon: Shuffle,
    },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
          <HelpCircle className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          <span>Passenger Support & FAQ</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          How GATIVERSE Helps You
        </h1>
        <p className="text-slate-600 text-sm">
          Everything you need to know about live tracking, dynamic predictions, and delay alerts.
        </p>
      </div>

      {/* FAQ Cards */}
      <div className="space-y-4">
        {faqs.map((faq) => {
          const Icon = faq.icon;
          return (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-blue-300 transition-all space-y-3"
            >
              <div className="flex items-center gap-3 text-slate-900 font-bold text-lg">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3>{faq.question}</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed pl-11">
                {faq.answer}
              </p>
            </div>
          );
        })}
      </div>

      {/* Support Callout */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 md:p-8 text-center space-y-3 shadow-lg">
        <h2 className="text-xl font-bold">Need assistance with your journey?</h2>
        <p className="text-blue-200 text-sm max-w-md mx-auto">
          Contact Indian Railway passenger helpline at <strong>139</strong> for emergency station inquiries and booking support.
        </p>
      </div>
    </main>
  );
}
