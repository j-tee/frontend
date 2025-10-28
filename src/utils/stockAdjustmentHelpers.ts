import type {
  AdjustmentType,
  AdjustmentStatus,
  AdjustmentTypeMetadata,
  StatusMetadata,
  DocumentType,
} from '../types/stockAdjustments'

// Adjustment Type Metadata
export const ADJUSTMENT_TYPE_METADATA: Record<AdjustmentType, AdjustmentTypeMetadata> = {
  THEFT: {
    code: 'THEFT',
    label: 'Theft/Shrinkage',
    icon: '🚨',
    color: 'red',
    isDecrease: true,
    requiresApproval: true,
  },
  DAMAGE: {
    code: 'DAMAGE',
    label: 'Damage/Breakage',
    icon: '💔',
    color: 'orange',
    isDecrease: true,
    requiresApproval: true,
  },
  EXPIRED: {
    code: 'EXPIRED',
    label: 'Expired Product',
    icon: '📅',
    color: 'yellow',
    isDecrease: true,
    requiresApproval: true,
  },
  SPOILAGE: {
    code: 'SPOILAGE',
    label: 'Spoilage',
    icon: '🦠',
    color: 'orange',
    isDecrease: true,
    requiresApproval: true,
  },
  LOSS: {
    code: 'LOSS',
    label: 'Lost/Missing',
    icon: '❓',
    color: 'gray',
    isDecrease: true,
    requiresApproval: true,
  },
  SAMPLE: {
    code: 'SAMPLE',
    label: 'Sample/Promotional',
    icon: '🎁',
    color: 'purple',
    isDecrease: true,
    requiresApproval: false,
  },
  WRITE_OFF: {
    code: 'WRITE_OFF',
    label: 'Write-off/Disposal',
    icon: '🗑️',
    color: 'red',
    isDecrease: true,
    requiresApproval: true,
  },
  SUPPLIER_RETURN: {
    code: 'SUPPLIER_RETURN',
    label: 'Return to Supplier',
    icon: '↩️',
    color: 'blue',
    isDecrease: true,
    requiresApproval: false,
  },
  TRANSFER_OUT: {
    code: 'TRANSFER_OUT',
    label: 'Transfer Out',
    icon: '📤',
    color: 'blue',
    isDecrease: true,
    requiresApproval: false,
  },
  CUSTOMER_RETURN: {
    code: 'CUSTOMER_RETURN',
    label: 'Customer Return',
    icon: '↩️',
    color: 'green',
    isDecrease: false,
    requiresApproval: false,
  },
  FOUND: {
    code: 'FOUND',
    label: 'Found Item',
    icon: '🔍',
    color: 'green',
    isDecrease: false,
    requiresApproval: false,
  },
  CORRECTION_INCREASE: {
    code: 'CORRECTION_INCREASE',
    label: 'Correction (Increase)',
    icon: '⬆️',
    color: 'green',
    isDecrease: false,
    requiresApproval: true,
  },
  TRANSFER_IN: {
    code: 'TRANSFER_IN',
    label: 'Transfer In',
    icon: '📥',
    color: 'green',
    isDecrease: false,
    requiresApproval: false,
  },
  CORRECTION: {
    code: 'CORRECTION',
    label: 'Inventory Correction',
    icon: '✏️',
    color: 'blue',
    isDecrease: false,
    requiresApproval: true,
  },
  RECOUNT: {
    code: 'RECOUNT',
    label: 'Physical Recount',
    icon: '🔢',
    color: 'blue',
    isDecrease: false,
    requiresApproval: true,
  },
  OTHER: {
    code: 'OTHER',
    label: 'Other',
    icon: '📝',
    color: 'gray',
    isDecrease: false,
    requiresApproval: true,
  },
}

// Status Metadata
export const STATUS_METADATA: Record<AdjustmentStatus, StatusMetadata> = {
  PENDING: {
    code: 'PENDING',
    label: 'Pending Approval',
    color: 'warning',
  },
  APPROVED: {
    code: 'APPROVED',
    label: 'Approved',
    color: 'info',
  },
  REJECTED: {
    code: 'REJECTED',
    label: 'Rejected',
    color: 'danger',
  },
  COMPLETED: {
    code: 'COMPLETED',
    label: 'Completed',
    color: 'success',
  },
}

// Document Type Labels
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  RECEIPT: 'Receipt',
  INVOICE: 'Invoice',
  POLICE_REPORT: 'Police Report',
  INSURANCE_CLAIM: 'Insurance Claim',
  SUPPLIER_RMA: 'Supplier RMA',
  COUNT_SHEET: 'Count Sheet',
  OTHER: 'Other',
}

// Decrease Types (negative quantity)
export const DECREASE_TYPES: AdjustmentType[] = [
  'THEFT',
  'DAMAGE',
  'EXPIRED',
  'SPOILAGE',
  'LOSS',
  'SAMPLE',
  'WRITE_OFF',
  'SUPPLIER_RETURN',
  'TRANSFER_OUT',
]

// Increase Types (positive quantity)
export const INCREASE_TYPES: AdjustmentType[] = [
  'CUSTOMER_RETURN',
  'FOUND',
  'CORRECTION_INCREASE',
  'TRANSFER_IN',
]

// Shrinkage Types (for reporting)
export const SHRINKAGE_TYPES: AdjustmentType[] = [
  'THEFT',
  'LOSS',
  'DAMAGE',
  'EXPIRED',
  'SPOILAGE',
  'WRITE_OFF',
]

// Helper Functions

export const getAdjustmentTypeMetadata = (type: AdjustmentType): AdjustmentTypeMetadata => {
  return ADJUSTMENT_TYPE_METADATA[type] || ADJUSTMENT_TYPE_METADATA.OTHER
}

export const getStatusMetadata = (status: AdjustmentStatus): StatusMetadata => {
  return STATUS_METADATA[status] || STATUS_METADATA.PENDING
}

export const getDocumentTypeLabel = (type: DocumentType): string => {
  return DOCUMENT_TYPE_LABELS[type] || 'Unknown'
}

export const isDecreaseType = (type: AdjustmentType): boolean => {
  return DECREASE_TYPES.includes(type)
}

export const isIncreaseType = (type: AdjustmentType): boolean => {
  return INCREASE_TYPES.includes(type)
}

export const isShrinkageType = (type: AdjustmentType): boolean => {
  return SHRINKAGE_TYPES.includes(type)
}

export const getAdjustmentIcon = (type: AdjustmentType): string => {
  return getAdjustmentTypeMetadata(type).icon
}

export const getAdjustmentColor = (type: AdjustmentType): string => {
  const color = getAdjustmentTypeMetadata(type).color
  // Map custom colors to Bootstrap variants for better visibility
  const colorMap: Record<string, string> = {
    'red': 'danger',
    'orange': 'warning',
    'yellow': 'warning',
    'purple': 'primary',
    'blue': 'info',
    'green': 'success',
    'gray': 'secondary',
  }
  return colorMap[color] || color
}

export const getStatusColor = (status: AdjustmentStatus): string => {
  return getStatusMetadata(status).color
}

export const formatAdjustmentType = (type: AdjustmentType): string => {
  return getAdjustmentTypeMetadata(type).label
}

export const formatAdjustmentStatus = (status: AdjustmentStatus): string => {
  return getStatusMetadata(status).label
}

// Format quantity with sign
export const formatQuantityWithSign = (quantity: number, type: AdjustmentType): string => {
  const sign = isDecreaseType(type) ? '-' : '+'
  return `${sign}${Math.abs(quantity)}`
}

// Get grouped adjustment types for dropdowns
export interface AdjustmentTypeGroup {
  label: string
  options: Array<{
    value: AdjustmentType
    label: string
    icon: string
  }>
}

export const getAdjustmentTypeGroups = (): AdjustmentTypeGroup[] => {
  return [
    {
      label: 'Decrease Stock',
      options: DECREASE_TYPES.map((type) => ({
        value: type,
        label: formatAdjustmentType(type),
        icon: getAdjustmentIcon(type),
      })),
    },
    {
      label: 'Increase Stock',
      options: INCREASE_TYPES.map((type) => ({
        value: type,
        label: formatAdjustmentType(type),
        icon: getAdjustmentIcon(type),
      })),
    },
    {
      label: 'Corrections',
      options: [
        {
          value: 'CORRECTION' as AdjustmentType,
          label: formatAdjustmentType('CORRECTION'),
          icon: getAdjustmentIcon('CORRECTION'),
        },
        {
          value: 'RECOUNT' as AdjustmentType,
          label: formatAdjustmentType('RECOUNT'),
          icon: getAdjustmentIcon('RECOUNT'),
        },
        {
          value: 'OTHER' as AdjustmentType,
          label: formatAdjustmentType('OTHER'),
          icon: getAdjustmentIcon('OTHER'),
        },
      ],
    },
  ]
}
