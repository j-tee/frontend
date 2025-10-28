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
  retail: {
    transactions: number;
    revenue: number;
    average_value: number;
    items_sold: number;
  };
  wholesale: {
    transactions: number;
    revenue: number;
    average_value: number;
    items_sold: number;
  };
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

export interface ProductMetrics {
  revenue: number;
  quantity: number;
  transactions: number;
}

export interface ProductBreakdown {
  product_id: string;
  name: string;
  sku: string;
  category: string;
  total_revenue: number;
  total_quantity: number;
  total_transactions: number;
  avg_price: number;
  retail: ProductMetrics;
  wholesale: ProductMetrics;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  quantity: number;
  products: number;
  transactions: number;
}

export interface ProductPerformanceSummary {
  total_revenue: number;
  total_quantity: number;
  total_products: number;
  total_transactions: number;
  avg_items_per_transaction: number;
  retail: {
    revenue: number;
    quantity: number;
    transactions: number;
    products: number;
  };
  wholesale: {
    revenue: number;
    quantity: number;
    transactions: number;
    products: number;
  };
}

export interface ProductPerformanceResponse {
  summary: ProductPerformanceSummary;
  products: ProductBreakdown[];
  categories: CategoryBreakdown[];
  period: {
    start: string;
    end: string;
    type: string;
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
      total_revenue: number;
      total_orders: number;
      average_revenue_per_customer: number;
      average_orders_per_customer: number;
      repeat_customer_rate: number;
      retail?: {
        customers: number;
        revenue: number;
        orders: number;
        avg_revenue_per_customer: number;
      };
      wholesale?: {
        customers: number;
        revenue: number;
        orders: number;
        avg_revenue_per_customer: number;
      };
      // Legacy fields (for backward compatibility)
      new_customers?: number;
      returning_customers?: number;
      customer_retention_rate?: number;
      average_customer_value?: number;
      customer_lifetime_value?: number;
    };
    segments?: {
      new: number;
      returning: number;
      vip: number;
      at_risk: number;
    };
    top_customers?: CustomerAnalytics[];
    purchase_frequency?: {
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
  profit_margin: number;
  order_count: number;
  average_order_value: number;
  growth_rate?: number;
  trend?: 'up' | 'down' | 'stable';
  
  // Retail/Wholesale breakdown per period
  retail: {
    revenue: number;
    orders: number;
    avg_order_value: number;
  };
  wholesale: {
    revenue: number;
    orders: number;
    avg_order_value: number;
  };
  
  // Payment methods breakdown
  payment_methods: {
    cash: number;
    card: number;
    credit: number;
    gcash: number;
    other: number;
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
    summary: {
      period_start: string;
      period_end: string;
      total_revenue: number;
      total_profit: number;
      profit_margin: number;
      total_orders: number;
      average_daily_revenue: number;
      average_order_value: number;
      peak_day: string | null;
      peak_revenue: number;
      
      // Retail/Wholesale breakdown
      retail: {
        revenue: number;
        profit: number;
        profit_margin: number;
        orders: number;
        avg_order_value: number;
      };
      wholesale: {
        revenue: number;
        profit: number;
        profit_margin: number;
        orders: number;
        avg_order_value: number;
      };
      
      // Optional previous period comparison
      previous_period?: {
        start: string;
        end: string;
        revenue: number;
        profit: number;
        orders: number;
      };
      comparison?: {
        revenue_growth: number;
        order_growth: number;
        profit_growth: number;
        revenue_change: number;
        order_change: number;
      };
    };
    results: {
      trends: RevenueTrend[];
      patterns: {
        peak_day: string | null;
        peak_revenue: number;
        lowest_day: string | null;
        lowest_revenue: number;
        volatility: 'low' | 'medium' | 'high';
        overall_trend: 'upward' | 'downward' | 'stable';
        growth_rate: number;
      };
    };
    metadata: {
      generated_at: string;
      start_date: string;
      end_date: string;
      filters: Record<string, any>;
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
    by_warehouse?: Record<string, {
      name: string;
      products: number;
      total_quantity: number;
      total_value: number;
    }>;
    by_category?: Record<string, {
      name: string;
      products: number;
      total_quantity: number;
      total_value: number;
    }>;
  };
  meta?: {
    pagination?: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
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
    by_warehouse?: Record<string, {
      name: string;
      alerts: number;
      restock_cost: number;
    }>;
    by_category?: Record<string, {
      name: string;
      alerts: number;
      restock_cost: number;
    }>;
  };
  meta?: {
    pagination?: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
  };
}

export interface StockMovement {
  movement_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  warehouse_id: string;
  warehouse_name: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer'; // legacy, keep for compatibility
  adjustment_type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_OUT' | 'TRANSFER_IN';
  reference_number?: string;
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
    by_warehouse?: Record<string, {
      name: string;
      movements: number;
      net_change: number;
    }>;
    by_category?: Record<string, {
      name: string;
      movements: number;
      net_change: number;
    }>;
  };
  meta?: {
    pagination?: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
  };
  // Deprecated - keeping for backwards compatibility
  pagination?: PaginationInfo;
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
  total_revenue: number;
  total_cost: number;
  gross_profit: number;
  gross_margin: number;
  net_profit: number;
  net_margin: number;
  total_sales: number;
  average_sale_value: number;
  best_margin: number;
  worst_margin: number;
  retail: {
    revenue: number;
    cost: number;
    profit: number;
    profit_margin: number;
    orders: number;
    avg_order_value: number;
  };
  wholesale: {
    revenue: number;
    cost: number;
    profit: number;
    profit_margin: number;
    orders: number;
    avg_order_value: number;
  };
}

export interface RevenueProfitTrend {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  order_count: number;
  average_order_value: number;
  retail: {
    revenue: number;
    profit: number;
    orders: number;
    avg_order_value: number;
  };
  wholesale: {
    revenue: number;
    profit: number;
    orders: number;
    avg_order_value: number;
  };
}

export interface RevenueProfitResponse {
  success: boolean;
  data: {
    summary: RevenueProfitSummary;
    results: RevenueProfitTrend[];
    metadata: ReportMetadata;
  };
  error?: string;
}

export interface ARAgingBuckets {
  current: number;
  '1_30_days': number;
  '31_60_days': number;
  '61_90_days': number;
  over_90_days: number;
}

export interface ARAgingSegment {
  ar_outstanding: number;
  percentage_of_total: number;
  aging_buckets: ARAgingBuckets;
}

export interface ARAgingSummary {
  as_of_date: string;
  total_ar_outstanding: number;
  total_customers_with_balance: number;
  aging_buckets: ARAgingBuckets;
  percentage_overdue: number;
  at_risk_amount: number;
  retail: ARAgingSegment;
  wholesale: ARAgingSegment;
}

export interface ARCustomer {
  rank: number;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  total_balance: number;
  credit_limit: number;
  credit_utilization: number;
  current: number;
  '1_30_days': number;
  '31_60_days': number;
  '61_90_days': number;
  over_90_days: number;
  risk_level: 'low' | 'medium' | 'high';
  retail_balance: number;
  wholesale_balance: number;
}

export interface ARAgingResponse {
  success: boolean;
  data: {
    summary: ARAgingSummary;
    results: ARCustomer[];
    metadata: ReportMetadata;
  };
  error?: string;
}

export interface CollectionRatesSegment {
  credit_sales_amount: number;
  collected_amount: number;
  collection_rate: number;
  average_collection_period_days: number;
  credit_sales_count: number;
}

export interface CollectionRatesSummary {
  total_credit_sales_amount: string;
  total_collected_amount: string;
  outstanding_amount: string;
  overall_collection_rate: number;
  average_collection_period_days: number;
  total_credit_sales_count: number;
  collected_sales_count: number;
  outstanding_sales_count: number;
  retail: CollectionRatesSegment;
  wholesale: CollectionRatesSegment;
}

export interface CollectionTrend {
  period: string;
  period_start: string;
  period_end: string;
  credit_sales_amount: string;
  collected_amount: string;
  collection_rate: number;
  average_days_to_collect: number;
  retail: {
    credit_sales_amount: number;
    collected_amount: number;
    collection_rate: number;
  };
  wholesale: {
    credit_sales_amount: number;
    collected_amount: number;
    collection_rate: number;
  };
}

export interface CollectionRatesResponse {
  success: boolean;
  data: {
    summary: CollectionRatesSummary;
    results: CollectionTrend[];
    metadata: ReportMetadata;
  };
  error?: string;
}

export interface CashFlowSegment {
  inflows: number;
  transaction_count: number;
  average_transaction: number;
}

export interface CashFlowSummary {
  total_inflows: string;
  total_outflows: string;
  net_cash_flow: string;
  opening_balance: string;
  closing_balance: string;
  inflow_by_method: {
    CASH: string;
    CARD: string;
    BANK_TRANSFER: string;
    MOBILE_MONEY: string;
  };
  inflow_by_type: {
    cash_sales: string;
    credit_payments: string;
  };
  retail: CashFlowSegment;
  wholesale: CashFlowSegment;
}

export interface CashFlowTrend {
  period: string;
  period_start: string;
  period_end: string;
  inflows: string;
  outflows: string;
  net_flow: string;
  running_balance: string;
  transaction_count: number;
  retail: {
    inflows: number;
    count: number;
  };
  wholesale: {
    inflows: number;
    count: number;
  };
}

export interface CashFlowResponse {
  success: boolean;
  data: {
    summary: CashFlowSummary;
    results: CashFlowTrend[];
    metadata: ReportMetadata;
  };
  error?: string;
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
  as_of_date?: string; // For AR Aging and point-in-time reports
  grouping?: 'daily' | 'weekly' | 'monthly'; // For time-series reports
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
  search?: string;
  include_forecast?: boolean;
  include_valuation?: boolean;
  compare_previous?: boolean;
  segment?: string;
  movement_type?: 'in' | 'out' | 'adjustment' | 'transfer';
  reference_type?: 'purchase_order' | 'sale' | 'transfer' | 'adjustment';
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  urgency?: 'critical' | 'warning' | 'watch';
  payment_method?: 'cash' | 'card' | 'credit';
  breakdown_by?: 'category' | 'storefront' | 'product' | 'time';
  utilization_threshold?: number;
  include_inactive?: boolean;
  segmentation_method?: 'rfm' | 'value' | 'behavior';
  min_purchases?: number;
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  export_format?: 'csv' | 'excel' | 'pdf';
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
