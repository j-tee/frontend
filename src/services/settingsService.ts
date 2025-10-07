import type { BusinessSettings } from '../types/settings'
import httpClient from './httpClient'

const API_BASE_URL = '/settings/api'

const settingsService = {
  // Get current business settings
  getSettings: async (): Promise<BusinessSettings> => {
    const response = await httpClient.get<BusinessSettings>(`${API_BASE_URL}/settings/`)
    return response.data
  },

  // Update business settings
  updateSettings: async (settings: Partial<BusinessSettings>): Promise<BusinessSettings> => {
    const response = await httpClient.patch<BusinessSettings>(`${API_BASE_URL}/settings/`, settings)
    return response.data
  },

  // Create initial settings (usually done automatically on business creation)
  createSettings: async (settings: Partial<BusinessSettings>): Promise<BusinessSettings> => {
    const response = await httpClient.post<BusinessSettings>(`${API_BASE_URL}/settings/`, settings)
    return response.data
  },
}

export default settingsService
