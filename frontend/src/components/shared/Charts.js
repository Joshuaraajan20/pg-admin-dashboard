import React from 'react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  actions,
}) {
  return (
    <div className={cn('chart-card', className)} data-testid={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      <div className="h-64">
        {children}
      </div>
    </div>
  );
}

export function RevenueChart({ data }) {
  const formatCurrency = (value) => `₹${(value / 1000).toFixed(0)}K`;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No revenue data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#2563EB"
          strokeWidth={2}
          dot={{ fill: '#2563EB', strokeWidth: 2 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function OccupancyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        No occupancy data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={200}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis
          dataKey="property"
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={{ stroke: '#E2E8F0' }}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 12 }}
          axisLine={{ stroke: '#E2E8F0' }}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <Tooltip
          content={<CustomTooltip formatter={(value) => `${value}%`} />}
        />
        <Bar
          dataKey="occupancy"
          name="Occupancy"
          fill="#2563EB"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
