import type { ThemePreset, ThemeColors } from '../types/settings'

export const THEME_PRESETS: Record<ThemePreset, ThemeColors> = {
  'default-blue': {
    primary: '#2563eb',
    secondary: '#1d4ed8',
    accent: '#7c3aed',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  'emerald-green': {
    primary: '#10b981',
    secondary: '#059669',
    accent: '#34d399',
    background: '#f0fdf4',
    surface: '#ffffff',
    text: '#064e3b',
    textSecondary: '#6b7280',
    border: '#d1fae5',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
  'purple-galaxy': {
    primary: '#7c3aed',
    secondary: '#6d28d9',
    accent: '#a78bfa',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#4c1d95',
    textSecondary: '#6b7280',
    border: '#e9d5ff',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#8b5cf6',
  },
  'sunset-orange': {
    primary: '#f97316',
    secondary: '#ea580c',
    accent: '#fb923c',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#7c2d12',
    textSecondary: '#6b7280',
    border: '#fed7aa',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  'ocean-teal': {
    primary: '#14b8a6',
    secondary: '#0d9488',
    accent: '#2dd4bf',
    background: '#f0fdfa',
    surface: '#ffffff',
    text: '#134e4a',
    textSecondary: '#6b7280',
    border: '#ccfbf1',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
  'rose-pink': {
    primary: '#f43f5e',
    secondary: '#e11d48',
    accent: '#fb7185',
    background: '#fff1f2',
    surface: '#ffffff',
    text: '#881337',
    textSecondary: '#6b7280',
    border: '#fecdd3',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#ec4899',
  },
  'slate-minimal': {
    primary: '#475569',
    secondary: '#334155',
    accent: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

/**
 * Convert hex color to RGB values (for rgba() usage)
 */
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0, 0, 0'
  
  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)
  
  return `${r}, ${g}, ${b}`
}

/**
 * Apply theme colors to CSS custom properties
 */
export const applyTheme = (preset: ThemePreset, customColors?: Partial<ThemeColors>): void => {
  const colors = {
    ...THEME_PRESETS[preset],
    ...customColors,
  }
  
  const root = document.documentElement
  
  root.style.setProperty('--color-primary', colors.primary)
  root.style.setProperty('--color-primary-rgb', hexToRgb(colors.primary))
  root.style.setProperty('--color-secondary', colors.secondary)
  root.style.setProperty('--color-accent', colors.accent)
  root.style.setProperty('--color-background', colors.background)
  root.style.setProperty('--color-surface', colors.surface)
  root.style.setProperty('--color-text', colors.text)
  root.style.setProperty('--color-text-secondary', colors.textSecondary)
  root.style.setProperty('--color-border', colors.border)
  root.style.setProperty('--color-success', colors.success)
  root.style.setProperty('--color-warning', colors.warning)
  root.style.setProperty('--color-error', colors.error)
  root.style.setProperty('--color-info', colors.info)
  
  // Also update Bootstrap variables if they exist
  root.style.setProperty('--bs-primary', colors.primary)
  root.style.setProperty('--bs-primary-rgb', hexToRgb(colors.primary))
  root.style.setProperty('--bs-secondary', colors.secondary)
  root.style.setProperty('--bs-success', colors.success)
  root.style.setProperty('--bs-warning', colors.warning)
  root.style.setProperty('--bs-danger', colors.error)
  root.style.setProperty('--bs-info', colors.info)
}

/**
 * Apply font size preference
 */
export const applyFontSize = (size: 'small' | 'medium' | 'large'): void => {
  const root = document.documentElement
  
  const sizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  }
  
  root.style.setProperty('--font-size-base', sizeMap[size])
}

/**
 * Apply color scheme (light/dark/auto)
 */
export const applyColorScheme = (scheme: 'light' | 'dark' | 'auto'): void => {
  const root = document.documentElement
  
  if (scheme === 'auto') {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-bs-theme', prefersDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-bs-theme', scheme)
  }
}

/**
 * Apply all appearance settings at once
 */
export const applyAppearanceSettings = (settings: {
  themePreset: ThemePreset
  customColors?: Partial<ThemeColors>
  fontSize: 'small' | 'medium' | 'large'
  colorScheme: 'light' | 'dark' | 'auto'
  compactMode?: boolean
  animationsEnabled?: boolean
  highContrast?: boolean
}): void => {
  applyTheme(settings.themePreset, settings.customColors)
  applyFontSize(settings.fontSize)
  applyColorScheme(settings.colorScheme)
  
  const root = document.documentElement
  
  if (settings.compactMode) {
    root.classList.add('compact-mode')
  } else {
    root.classList.remove('compact-mode')
  }
  
  if (settings.animationsEnabled === false) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
  
  if (settings.highContrast) {
    root.classList.add('high-contrast')
  } else {
    root.classList.remove('high-contrast')
  }
}
