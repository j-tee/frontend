import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading report...' 
}) => {
  return (
    <div className="rounded-3xl border border-slate-300 bg-white p-12 text-center shadow-sm">
      <div className="inline-flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"></div>
      </div>
      <p className="mt-4 text-lg font-medium text-slate-700">{message}</p>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="rounded-3xl border border-red-300 bg-red-50 p-12 text-center shadow-sm">
      <div className="text-4xl">❌</div>
      <p className="mt-4 text-lg font-bold text-red-900">Error Loading Report</p>
      <p className="mt-2 text-base font-medium text-red-700">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-red-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-red-800"
        >
          🔄 Retry
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  message?: string;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  message = 'No data available for the selected period',
  icon = '📭'
}) => {
  return (
    <div className="rounded-3xl border border-slate-300 bg-slate-50 p-12 text-center shadow-sm">
      <div className="text-4xl">{icon}</div>
      <p className="mt-4 text-lg font-medium text-slate-700">{message}</p>
      <p className="mt-2 text-sm font-medium text-slate-600">
        Try adjusting your filters or date range
      </p>
    </div>
  );
};

// Grouped exports for convenience
export const ReportStates = {
  Loading: LoadingState,
  Error: ErrorState,
  Empty: EmptyState,
};
