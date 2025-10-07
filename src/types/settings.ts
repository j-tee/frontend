// Types for application settings

import type { UUID } from './common'

export interface Currency {
  code: string
  symbol: string
  name: string
  position: 'before' | 'after' // Symbol position relative to amount
  decimalPlaces: number
}

export const AVAILABLE_CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'before', decimalPlaces: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'before', decimalPlaces: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', position: 'before', decimalPlaces: 2 },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', position: 'before', decimalPlaces: 2 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', position: 'before', decimalPlaces: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', position: 'before', decimalPlaces: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', position: 'before', decimalPlaces: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', position: 'before', decimalPlaces: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'before', decimalPlaces: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'before', decimalPlaces: 2 },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar', position: 'before', decimalPlaces: 2 },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar', position: 'before', decimalPlaces: 2 },
]

export type ColorScheme = 'light' | 'dark' | 'auto'

export type ThemePreset = 
  | 'default-blue'     // Professional blue (current)
  | 'emerald-green'    // Fresh and modern
  | 'purple-galaxy'    // Creative and bold
  | 'sunset-orange'    // Warm and energetic
  | 'ocean-teal'       // Calm and trustworthy
  | 'rose-pink'        // Friendly and approachable
  | 'slate-minimal'    // Clean and sophisticated

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface AppearanceSettings {
  colorScheme: ColorScheme
  themePreset: ThemePreset
  customColors?: Partial<ThemeColors>
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
  animationsEnabled: boolean
  highContrast: boolean
}

export interface RegionalSettings {
  currency: Currency
  timezone: string
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  firstDayOfWeek: 0 | 1 // 0 = Sunday, 1 = Monday
  numberFormat: 'en-US' | 'en-GB' | 'de-DE' | 'fr-FR'
}

export interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
  lowStockAlerts: boolean
  salesUpdates: boolean
  systemUpdates: boolean
  marketingEmails: boolean
}

export interface ReceiptSettings {
  showLogo: boolean
  logoUrl?: string
  headerText?: string
  footerText?: string
  showTaxBreakdown: boolean
  showBarcode: boolean
  paperSize: 'thermal-58mm' | 'thermal-80mm' | 'A4' | 'letter'
}

export interface BusinessSettings {
  id?: UUID
  business: UUID
  regional: RegionalSettings
  appearance: AppearanceSettings
  notifications: NotificationSettings
  receipt: ReceiptSettings
  created_at?: string
  updated_at?: string
}

export interface SettingsState {
  settings: BusinessSettings | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed'
  saveError: string | null
}
