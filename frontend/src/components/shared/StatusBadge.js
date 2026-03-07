import React from 'react';
import { cn, getStatusColor, capitalize } from '@/lib/utils';

export function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'badge',
        getStatusColor(status),
        className
      )}
      data-testid={`status-badge-${status}`}
    >
      {capitalize(status)}
    </span>
  );
}
