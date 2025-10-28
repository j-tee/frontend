import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { ReportContainer } from '../components/ReportContainer';
import { SummaryCard } from '../components/SummaryCard';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { ReportStates } from '../components/ReportStates';
import { customerReportsService } from '../../../services/reportsService';
import type { SegmentationResponse, RFMSegment } from '../../../types/reports';

const CustomerSegmentationPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SegmentationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

  // Filters
  const [startDate] = useState(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await customerReportsService.getSegmentation({
        start_date: startDate,
        end_date: endDate,
        segmentation_method: 'rfm'
      });
      setData(result);
    } catch (err) {
      setError((err as Error).message || 'Failed to load segmentation data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await customerReportsService.exportSegmentationCSV({
        start_date: startDate,
        end_date: endDate,
        segmentation_method: 'rfm'
      });
    } catch (err) {
      alert('Export failed: ' + (err as Error).message);
    }
  };

  const getSegmentColor = (segmentName: string): string => {
    const colors: Record<string, string> = {
      'Champions': 'border-purple-300 bg-purple-50',
      'Loyal Customers': 'border-blue-300 bg-blue-50',
      'Potential Loyalists': 'border-green-300 bg-green-50',
      'Recent Customers': 'border-teal-300 bg-teal-50',
      'Promising': 'border-cyan-300 bg-cyan-50',
      'Needs Attention': 'border-amber-300 bg-amber-50',
      'At Risk': 'border-orange-300 bg-orange-50',
      'Lost': 'border-red-300 bg-red-50'
    };
    return colors[segmentName] || 'border-gray-300 bg-gray-50';
  };

  const getRFMBadgeColors = (score: number): string => {
    if (score >= 4) return 'bg-green-100 text-green-700';
    if (score >= 3) return 'bg-blue-100 text-blue-700';
    if (score >= 2) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading && !data) return <ReportStates.Loading />;
  if (error) return <ReportStates.Error error={error} onRetry={loadData} />;
  if (!data) return <ReportStates.Empty message="No segmentation data available" />;

  return (
    <ReportContainer
      title="Customer Segmentation"
      subtitle="RFM analysis and behavioral grouping"
      icon="🎯"
      actions={
        <>
          <button
            onClick={() => navigate('/app/reports/customer')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </>
      }
    >
      {/* Date Range Filter */}
      <div className="mb-6">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={() => {}}
          onEndDateChange={() => {}}
        />
      </div>

      {/* Method Badge */}
      <div className="mb-6">
        <span className="inline-flex items-center px-3 py-1 text-sm font-medium text-purple-700 bg-purple-100 rounded-full">
          <Target className="w-4 h-4 mr-2" />
          {data.data.method.toUpperCase()} Segmentation
        </span>
        <p className="text-sm text-gray-600 mt-2">
          Recency, Frequency, Monetary analysis scores customers on a 1-5 scale
        </p>
      </div>

      {/* Key Insights */}
      {data.data.insights && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            title="Highest Revenue"
            value={data.data.insights.highest_revenue_segment}
          />
          <SummaryCard
            title="Largest Segment"
            value={data.data.insights.largest_segment}
          />
          <SummaryCard
            title="Fastest Growing"
            value={data.data.insights.fastest_growing_segment}
          />
          <SummaryCard
            title="Needs Attention"
            value={data.data.insights.needs_attention}
          />
        </div>
      )}

      {/* Segments */}
      <div className="space-y-4">
        {data.data.segments.map((segment: RFMSegment) => (
          <div
            key={segment.segment_code}
            className={`border-2 rounded-lg ${getSegmentColor(segment.segment_name)}`}
          >
            {/* Segment Header */}
            <div
              className="p-6 cursor-pointer"
              onClick={() =>
                setExpandedSegment(
                  expandedSegment === segment.segment_code ? null : segment.segment_code
                )
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {segment.segment_name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-mono font-medium bg-white rounded">
                      {segment.segment_code}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{segment.description}</p>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-gray-600">Customers</div>
                      <div className="text-lg font-bold text-gray-900">
                        {segment.customer_count}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Total Revenue</div>
                      <div className="text-lg font-bold text-gray-900">
                        ₦{segment.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Avg Order Value</div>
                      <div className="text-lg font-bold text-gray-900">
                        ₦{segment.average_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">RFM Scores</div>
                      <div className="flex items-center space-x-1 mt-1">
                        <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${getRFMBadgeColors(segment.recency_score)}`}>
                          R:{segment.recency_score}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${getRFMBadgeColors(segment.frequency_score)}`}>
                          F:{segment.frequency_score}
                        </span>
                        <span className={`px-1.5 py-0.5 text-xs font-bold rounded ${getRFMBadgeColors(segment.monetary_score)}`}>
                          M:{segment.monetary_score}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                <div className="ml-4">
                  {expandedSegment === segment.segment_code ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedSegment === segment.segment_code && (
              <div className="px-6 pb-6 border-t border-gray-200 bg-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  {/* Characteristics */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Characteristics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Days Since Last Purchase:</span>
                        <span className="font-medium text-gray-900">
                          {segment.characteristics.avg_days_since_last_purchase} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Purchase Frequency:</span>
                        <span className="font-medium text-gray-900">
                          {segment.characteristics.avg_purchase_frequency} purchases
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg Total Spend:</span>
                        <span className="font-medium text-gray-900">
                          ₦{segment.characteristics.avg_total_spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Actions */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Recommended Actions</h4>
                    <ul className="space-y-2">
                      {segment.recommended_actions.map((action: string, idx: number) => (
                        <li key={idx} className="flex items-start text-sm">
                          <span className="text-green-500 mr-2 mt-0.5">✓</span>
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Target className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">RFM Segmentation Guide</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Recency (R):</strong> How recently did the customer purchase? (5 = most recent)</p>
              <p><strong>Frequency (F):</strong> How often do they purchase? (5 = most frequent)</p>
              <p><strong>Monetary (M):</strong> How much do they spend? (5 = highest spend)</p>
              <p className="mt-2">Use these segments to personalize marketing campaigns, loyalty programs, and retention strategies.</p>
            </div>
          </div>
        </div>
      </div>
    </ReportContainer>
  );
};

export default CustomerSegmentationPage;
