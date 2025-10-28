import httpClient from './httpClient'

export interface UpdateProfilePayload {
  name: string
  phone?: string
  address?: string
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export interface UserPreferences {
  language: string
  timezone: string
  dateFormat: string
  timeFormat: string
  emailNotifications: boolean
  smsNotifications: boolean
  desktopNotifications: boolean
}

export interface NotificationSettings {
  sales: {
    email: boolean
    push: boolean
    sms: boolean
  }
  inventory: {
    email: boolean
    push: boolean
    sms: boolean
  }
  payments: {
    email: boolean
    push: boolean
    sms: boolean
  }
  users: {
    email: boolean
    push: boolean
    sms: boolean
  }
  system: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

/**
 * Update user profile information
 */
export const updateUserProfile = async (data: UpdateProfilePayload) => {
  const response = await httpClient.patch('/accounts/api/profile/', data)
  return response.data
}

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (file: File) => {
  const formData = new FormData()
  formData.append('picture', file)

  const response = await httpClient.post('/accounts/api/profile/picture/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

/**
 * Change password
 */
export const changePassword = async (data: ChangePasswordPayload) => {
  const response = await httpClient.post('/accounts/api/change-password/', data)
  return response.data
}

/**
 * Enable two-factor authentication
 */
export const enable2FA = async () => {
  const response = await httpClient.post('/accounts/api/2fa/enable/')
  return response.data
}

/**
 * Disable two-factor authentication
 */
export const disable2FA = async () => {
  const response = await httpClient.post('/accounts/api/2fa/disable/')
  return response.data
}

/**
 * Update user preferences
 */
export const updateUserPreferences = async (preferences: UserPreferences) => {
  const response = await httpClient.patch('/accounts/api/preferences/', preferences)
  return response.data
}

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (settings: NotificationSettings) => {
  const response = await httpClient.patch('/accounts/api/notifications/', settings)
  return response.data
}

/**
 * Get user profile
 */
export const getUserProfile = async () => {
  const response = await httpClient.get('/accounts/api/profile/')
  return response.data
}
