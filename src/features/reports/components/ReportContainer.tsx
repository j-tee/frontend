import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ReportContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  icon?: string;
  backPath?: string;
}

export const ReportContainer: React.FC<ReportContainerProps> = ({
  title,
  subtitle,
  children,
  actions,
  icon,
  backPath = '/app/reports',
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {icon && <span className="text-4xl">{icon}</span>}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate(backPath)}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
                  title="Back to Reports Dashboard"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
              </div>
              <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
              {subtitle && (
                <p className="mt-2 text-base font-medium text-slate-700">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      {children}
    </div>
  );
};
