// ========================================
// REPORTS MODULE - TYPE DEFINITIONS
// ========================================
// Generated from backend API specifications
// Last Updated: October 12, 2025

// ========================================
// COMMON TYPES
// ========================================

export interface ReportPeriod {
  start_date: string;
  end_date: string;
  days: number;
  type?: 'daily' | 'weekly' | 'monthly';
}

export interface PaginationInfo {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReportMetadata {
  generated_at: string;
  period: string;
  total_records: number;
  filters_applied: Record<string, any>;
}

export interface BaseReportResponse<T = any> {
  success: boolean;
  data: {
    results?: T[];
    summary?: Record<string, any>;
    metadata?: ReportMetadata;
  };
  error: string | null;
}

// ========================================
// SALES REPORTS
// ========================================

export interface SalesSummary {
  total_sales: number;
  total_transactions: number;
  average_transaction_value: number;
  total_items_sold: number;
  total_customers: number;
  total_discounts_given: number;
  net_sales: number;
  growth_rate: number;
  period: ReportPeriod;
}

export interface SalesBreakdown {
  period: string;
  sales: number;
  transactions: number;
  avg_value: number;
  items_sold: number;
  customers: number;
}

export interface TopSellingHour {
  hour: number;
  sales: number;
  transactions: number;
}

export interface PeriodComparison {
  previous_period: {
    start: string;
    end: string;
    total_sales: number;
    growth: number;
  };
}

export interface SalesSummaryResponse {
  success: boolean;
  data: {
    summary: SalesSummary;
    breakdown: SalesBreakdown[];
    top_selling_hours: TopSellingHour[];
    comparison?: PeriodComparison;
  };
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  total_revenue: number;
  total_quantity_sold: number;
  total_profit: number;
  profit_margin: number;
  average_selling_price: number;
  cost_of_goods_sold: number;
  times_ordered: number;
  first_sale_date: string;
  last_sale_date: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ProductPerformanceResponse {
  success: boolean;
  data: {
    products: ProductPerformance[];
    summary: {
      total_products_sold: number;
      total_revenue: number;
      total_profit: number;
      average_profit_margin: number;
    };
  };
}

export interface CustomerAnalytics {
  customer_id: string;
  customer_name: string;
  total_spent: number;
  total_purchases: number;
  average_order_value: number;
  last_purchase_date: string;
  customer_since: string;
  segment: 'new' | 'returning' | 'vip' | 'at_risk';
}

export interface CustomerAnalyticsResponse {
  success: boolean;
  data: {
    summary: {
      total_customers: number;
      new_customers: number;
      returning_customers: number;
      customer_retention_rate: number;
      average_customer_value: number;
      customer_lifetime_value: number;
    };
    segments: {
      new: number;
      returning: number;
      vip: number;
      at_risk: number;
    };
    top_customers: CustomerAnalytics[];
    purchase_frequency: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
}

export interface RevenueTrend {
  period: string;
  revenue: number;
  profit: number;
  transactions: number;
  average_order_value: number;
  payment_methods: {
    cash: number;
    card: number;
    credit: number;
  };
}

export interface RevenueForecast {
  period: string;
  predicted_revenue: number;
  confidence: number;
  upper_bound: number;
  lower_bound: number;
}

export interface RevenueTrendsResponse {
  success: boolean;
  data: {
    trends: RevenueTrend[];
    forecast?: RevenueForecast[];
    patterns: {
      peak_day: string;
      peak_hour: number;
      seasonal_trend: string;
      volatility: 'low' | 'medium' | 'high';
    };
  };
}

// ========================================
// INVENTORY REPORTS
// ========================================

export interface StockLocation {
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  reserved: number;
  available: number;
  reorder_point: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface StockLevel {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  locations: StockLocation[];
  total_quantity: number;
  total_available: number;
  unit_cost: number;
  total_value: number;
  last_restocked: string;
  days_until_stockout: number;
}

export interface StockLevelsResponse {
  success: boolean;
  data: {
    summary: {
      total_products: number;
      total_variants: number;
      in_stock: number;
      low_stock: number;
      out_of_stock: number;
      total_stock_value: number;
      warehouses_count: number;
    };
    items: StockLevel[];
  };
}

export interface LowStockAlert {
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  urgency: 'critical' | 'warning' | 'watch';
  average_daily_sales: number;
  days_until_stockout: number;
  last_restock_date: string;
  supplier: string;
  lead_time_days: number;
  suggested_order_date: string;
  estimated_cost: number;
}

export interface LowStockAlertsResponse {
  success: boolean;
  data: {
    summary: {
      critical: number;
      warning: number;
      watch: number;
    };
    alerts: LowStockAlert[];
    total_restock_cost: number;
  };
}

export interface StockMovement {
  movement_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type: 'purchase_order' | 'sale' | 'transfer' | 'adjustment';
  reference_id: string;
  performed_by: string;
  performed_by_id: string;
  notes: string;
  created_at: string;
}

export interface StockMovementsResponse {
  success: boolean;
  data: {
    summary: {
      total_movements: number;
      total_in: number;
      total_out: number;
      total_adjustments: number;
      total_transfers: number;
    };
    movements: StockMovement[];
    pagination: PaginationInfo;
  };
}

export interface WarehouseAnalytics {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_type: 'warehouse' | 'storefront';
  metrics: {
    total_products: number;
    total_stock_value: number;
    stock_turnover_ratio: number;
    average_days_in_stock: number;
    dead_stock_count: number;
    dead_stock_value: number;
    stock_accuracy: number;
    storage_utilization: number;
    movements: {
      inbound: number;
      outbound: number;
      transfers_in: number;
      transfers_out: number;
    };
  };
  top_products: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    value: number;
    turnover_rate: number;
  }>;
  slow_movers: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    value: number;
    days_since_last_sale: number;
  }>;
}

export interface WarehouseAnalyticsResponse {
  success: boolean;
  data: {
    warehouses: WarehouseAnalytics[];
  };
}

// ========================================
// FINANCIAL REPORTS
// ========================================

export interface RevenueProfitSummary {
  gross_revenue: number;
  discounts: number;
  refunds: number;
  net_revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_profit_margin: number;
  operating_expenses: number;
  net_profit: number;
  net_profit_margin: number;
}

export interface RevenueProfitBreakdown {
  label: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

export interface Expense {
  category: string;
  amount: number;
}

export interface RevenueProfitResponse {
  success: boolean;
  data: {
    summary: RevenueProfitSummary;
    breakdown: RevenueProfitBreakdown[];
    expenses: Expense[];
  };
}

export interface ARAgingSummary {
  total_outstanding: number;
  current: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  total_customers: number;
  average_days_outstanding: number;
}

export interface AgingBucket {
  bucket: string;
  amount: number;
  percentage: number;
  customer_count: number;
}

export interface ARCustomer {
  customer_id: string;
  customer_name: string;
  total_outstanding: number;
  current: number;
  days_31_60: number;
  days_61_90: number;
  over_90_days: number;
  oldest_invoice_date: string;
  days_overdue: number;
  credit_limit: number;
  credit_used_percentage: number;
  last_payment_date: string;
  last_payment_amount: number;
}

export interface ARAgingResponse {
  success: boolean;
  data: {
    summary: ARAgingSummary;
    aging_buckets: AgingBucket[];
    customers: ARCustomer[];
  };
}

export interface CollectionRatesSummary {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
  average_collection_time: number;
  on_time_collection_rate: number;
}

export interface PaymentMethodStats {
  method: string;
  amount_collected: number;
  percentage: number;
  transaction_count: number;
}

export interface CollectionTrend {
  period: string;
  invoiced: number;
  collected: number;
  collection_rate: number;
}

export interface DelinquentAccount {
  customer_id: string;
  customer_name: string;
  amount_overdue: number;
  days_overdue: number;
  oldest_invoice: string;
}

export interface CollectionRatesResponse {
  success: boolean;
  data: {
    summary: CollectionRatesSummary;
    by_payment_method: PaymentMethodStats[];
    trends: CollectionTrend[];
    delinquent_accounts: DelinquentAccount[];
  };
}

export interface CashFlowSummary {
  opening_balance: number;
  total_inflows: number;
  total_outflows: number;
  net_cash_flow: number;
  closing_balance: number;
  cash_flow_health: 'positive' | 'neutral' | 'negative';
}

export interface CashFlowInflows {
  sales_revenue: number;
  credit_collections: number;
  other_income: number;
}

export interface CashFlowOutflows {
  inventory_purchases: number;
  salaries: number;
  rent: number;
  utilities: number;
  other_expenses: number;
}

export interface CashFlowTimeline {
  period: string;
  inflows: number;
  outflows: number;
  net_flow: number;
  balance: number;
}

export interface CashFlowForecast {
  period: string;
  predicted_inflows: number;
  predicted_outflows: number;
  predicted_balance: number;
}

export interface CashFlowResponse {
  success: boolean;
  data: {
    summary: CashFlowSummary;
    inflows: CashFlowInflows;
    outflows: CashFlowOutflows;
    timeline: CashFlowTimeline[];
    forecast?: CashFlowForecast[];
  };
}

// ========================================
// CUSTOMER REPORTS
// ========================================

export interface TopCustomer {
  customer_id: string;
  customer_name: string;
  email: string;
  phone: string;
  total_revenue: number;
  total_purchases: number;
  average_order_value: number;
  first_purchase_date: string;
  last_purchase_date: string;
  customer_lifetime_days: number;
  purchase_frequency: 'weekly' | 'bi-weekly' | 'monthly';
  favorite_category: string;
  credit_limit: number;
  credit_used: number;
  loyalty_tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  status: 'active' | 'at-risk' | 'inactive';
}

export interface TopCustomersResponse {
  success: boolean;
  data: {
    summary: {
      total_customers: number;
      top_10_revenue: number;
      top_10_percentage: number;
      average_customer_value: number;
    };
    customers: TopCustomer[];
  };
}

export interface CustomerSegment {
  count: number;
  total_revenue: number;
  average_order_value: number;
  conversion_rate?: number;
  retention_rate?: number;
  percentage_of_total?: number;
  last_purchase_days_avg?: number;
  potential_lost_revenue?: number;
}

export interface PurchaseBehavior {
  average_time_between_purchases: number;
  peak_purchase_day: string;
  peak_purchase_hour: number;
  average_items_per_order: number;
  cross_sell_rate: number;
  up_sell_rate: number;
}

export interface ProductPreference {
  category: string;
  customer_count: number;
  total_revenue: number;
  average_spend: number;
  repeat_purchase_rate: number;
}

export interface PurchasePatternsResponse {
  success: boolean;
  data: {
    segments: {
      new_customers: CustomerSegment;
      returning_customers: CustomerSegment;
      vip_customers: CustomerSegment;
      at_risk_customers: CustomerSegment;
    };
    purchase_behavior: PurchaseBehavior;
    product_preferences: ProductPreference[];
    channel_preferences: {
      in_store: number;
      online: number;
      phone: number;
    };
  };
}

export interface CreditCustomer {
  customer_id: string;
  customer_name: string;
  credit_limit: number;
  credit_used: number;
  credit_available: number;
  utilization_percentage: number;
  outstanding_balance: number;
  days_overdue: number;
  payment_history_score: number;
  risk_level: 'high' | 'medium' | 'low';
  recommended_action: 'reduce_limit' | 'monitor' | 'increase_limit';
  last_payment_date: string;
  last_payment_amount: number;
}

export interface CreditUtilizationResponse {
  success: boolean;
  data: {
    summary: {
      total_customers_with_credit: number;
      total_credit_extended: number;
      total_credit_used: number;
      average_utilization: number;
      over_80_percent: number;
      at_limit: number;
      credit_risk_high: number;
    };
    customers: CreditCustomer[];
    risk_distribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
}

export interface RFMSegment {
  segment_name: string;
  segment_code: string;
  description: string;
  customer_count: number;
  total_revenue: number;
  average_order_value: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  characteristics: {
    avg_days_since_last_purchase: number;
    avg_purchase_frequency: number;
    avg_total_spend: number;
  };
  recommended_actions: string[];
}

export interface SegmentationResponse {
  success: boolean;
  data: {
    method: 'rfm' | 'value' | 'behavior';
    segments: RFMSegment[];
    insights: {
      highest_revenue_segment: string;
      largest_segment: string;
      fastest_growing_segment: string;
      needs_attention: string;
    };
  };
}

// ========================================
// FILTER TYPES
// ========================================

export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  storefront_id?: string;
  warehouse_id?: string;
  category_id?: string;
  customer_type?: 'retail' | 'wholesale';
  customer_id?: string;
  product_id?: string;
  group_by?: 'day' | 'week' | 'month';
  period_type?: 'daily' | 'weekly' | 'monthly';
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  sort_by?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  page_size?: number;
  include_forecast?: boolean;
  include_valuation?: boolean;
  compare_previous?: boolean;
  segment?: string;
  movement_type?: 'in' | 'out' | 'adjustment' | 'transfer';
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  urgency?: 'critical' | 'warning' | 'watch';
  payment_method?: 'cash' | 'card' | 'credit';
  breakdown_by?: 'category' | 'storefront' | 'product' | 'time';
  utilization_threshold?: number;
  include_inactive?: boolean;
  segmentation_method?: 'rfm' | 'value' | 'behavior';
  min_purchases?: number;
  format?: 'json' | 'csv' | 'excel' | 'pdf';
}

// ========================================
// ERROR TYPES
// ========================================

export interface ReportError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ReportErrorResponse {
  success: false;
  data: null;
  error: ReportError;
}
