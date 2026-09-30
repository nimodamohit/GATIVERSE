import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading live train status...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 space-y-4 text-center">
      <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl animate-spin">
        <Loader2 className="w-8 h-8" aria-hidden="true" />
      </div>
      <p className="text-base font-semibold text-slate-800">{message}</p>
      <p className="text-xs text-slate-500">Fetching real-time updates from GATIVERSE engine...</p>
    </div>
  );
};
