import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { Store } from '@reduxjs/toolkit'
import type { RootState } from '../store/index.js'
import { clearAuthSession } from '../store/slices/authSlice.js'
import { showSubscriptionGate } from '../store/slices/subscriptionSlice.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const httpClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

export const setupHttpInterceptors = (store: Store<RootState>) => {
  httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const headers = config.headers
    const isAxiosHeaders = headers instanceof AxiosHeaders
    const skipAuthValue = isAxiosHeaders
      ? headers.get('X-Skip-Auth') ?? headers.get('x-skip-auth')
      : (headers?.['X-Skip-Auth'] ?? headers?.['x-skip-auth'])

    if (skipAuthValue) {
      if (isAxiosHeaders) {
        headers.delete('X-Skip-Auth')
        headers.delete('x-skip-auth')
        headers.delete('Authorization')
      } else if (headers) {
        delete (headers as Record<string, unknown>)['X-Skip-Auth']
        delete (headers as Record<string, unknown>)['x-skip-auth']
        delete (headers as Record<string, unknown>)['Authorization']
      }
      return config
    }

    const state = store.getState()
    const token = state.auth.token
    if (token) {
      if (isAxiosHeaders) {
        headers.set('Authorization', `Token ${token}`)
      } else {
        config.headers = config.headers ?? {}
        ;(config.headers as Record<string, unknown>)['Authorization'] = `Token ${token}`
      }
    }
    return config
  })

  httpClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      if (!error.response) {
        return Promise.reject(error)
      }

      const { status } = error.response

      if (status === 401) {
        store.dispatch(clearAuthSession(undefined))
      }

      if (status === 403) {
        const data = (error.response.data ?? {}) as { detail?: string }
        store.dispatch(showSubscriptionGate(data.detail ?? null))
      }

      return Promise.reject(error)
    },
  )
}

export default httpClient
