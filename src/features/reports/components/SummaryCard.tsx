import React from 'react';
import { Info } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: string;
  change?: number;
  changeLabel?: string;
  color?: string;
  subtitle?: string;
  tooltip?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  color = 'bg-blue-50 border-blue-200',
  subtitle,
  tooltip,
}) => {
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-slate-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md ${color}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-700">{title}</p>
            {tooltip && (
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg">
                  {tooltip}
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-900 rotate-45"></div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs font-medium text-slate-600">{subtitle}</p>
          )}
          {change !== undefined && (
            <p className={`mt-2 flex items-center gap-1 text-sm font-medium ${getChangeColor(change)}`}>
              <span>{getChangeIcon(change)}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
              {changeLabel && <span className="text-slate-600">{changeLabel}</span>}
            </p>
          )}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
};
