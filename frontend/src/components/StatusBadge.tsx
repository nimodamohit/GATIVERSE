import React from 'react';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'On Time' | 'Delayed' | 'Early' | 'Cancelled';
  delayMinutes?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  delayMinutes = 0,
  size = 'md',
}) => {
  let badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
  let icon = <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />;
  let labelText: string = status;

  if (status === 'Delayed') {
    badgeStyle = 'bg-amber-100 text-amber-900 border-amber-300';
    icon = <Clock className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />;
    labelText = delayMinutes > 0 ? `Delayed +${delayMinutes} min` : 'Delayed';
  } else if (status === 'Early') {
    badgeStyle = 'bg-blue-100 text-blue-900 border-blue-300';
    icon = <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />;
    labelText = `Early ${Math.abs(delayMinutes)} min`;
  } else if (status === 'Cancelled') {
    badgeStyle = 'bg-rose-100 text-rose-900 border-rose-300';
    icon = <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" aria-hidden="true" />;
    labelText = 'Cancelled';
  }

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-sm gap-2 font-medium',
    lg: 'px-4 py-1.5 text-base gap-2.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${badgeStyle} ${sizeClasses[size]}`}
      aria-label={`Status: ${labelText}`}
    >
      {icon}
      <span>{labelText}</span>
    </span>
  );
};
