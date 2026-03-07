import React from 'react';
import { cn } from '@/lib/utils';

export function StatCard({ title, value, icon: Icon, trend, trendLabel, className }) {
  return (
    <div className={cn('stat-card', className)} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {trend !== undefined && (
            <p className={cn(
              'mt-2 text-sm font-medium',
              trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
            )}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 rounded-xl">
            <Icon className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}
