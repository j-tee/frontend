import React from 'react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApply?: () => void;
  showPresets?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApply,
  showPresets = true,
}) => {
  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    onStartDateChange(start.toISOString().split('T')[0]);
    onEndDateChange(end.toISOString().split('T')[0]);

    if (onApply) {
      onApply();
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Inputs */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            max={endDate}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            min={startDate}
            max={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          />
        </div>

        {onApply && (
          <button
            onClick={onApply}
            className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Apply
          </button>
        )}
      </div>

      {/* Preset Buttons */}
      {showPresets && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePreset(7)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handlePreset(30)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handlePreset(90)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              onStartDateChange(firstDay.toISOString().split('T')[0]);
              onEndDateChange(now.toISOString().split('T')[0]);
              if (onApply) onApply();
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            This Month
          </button>
        </div>
      )}
    </div>
  );
};
