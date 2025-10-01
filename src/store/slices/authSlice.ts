import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError, type AxiosError } from 'axios'
import {
  changePassword as changePasswordRequest,
  fetchBusinessesWithToken,
  fetchCurrentUser as fetchCurrentUserRequest,
  login as loginRequest,
  logout as logoutRequest,
  registerAccount as registerAccountRequest,
  registerBusiness as registerBusinessRequest,
  verifyEmail as verifyEmailRequest,
} from '../../services/authService.js'
import type {
  AuthResponse,
  RegisterAccountPayload,
  RegisterAccountResponse,
  BusinessSummary,
  LoginPayload,
  RegisterBusinessPayload,
  UserProfile,
  AccountType,
  VerifyEmailPayload,
  VerifyEmailResponse,
} from '../../types/auth.js'
import type { Business } from '../../types/business.js'
import type { PaginatedResponse } from '../../types/common.js'
import type { UUID } from '../../types/common.js'
import type { RootState } from '../index.js'

const TOKEN_STORAGE_KEY = 'pos_token'
const BUSINESS_STORAGE_KEY = 'pos_business'

const readTokenFromStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

const writeTokenToStorage = (token: string | null) => {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

const readBusinessFromStorage = (): BusinessSummary | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(BUSINESS_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as BusinessSummary
  } catch (error) {
    void error
    return null
  }
}

const writeBusinessToStorage = (business: BusinessSummary | null) => {
  if (typeof window === 'undefined') return
  if (business) {
    window.localStorage.setItem(BUSINESS_STORAGE_KEY, JSON.stringify(business))
  } else {
    window.localStorage.removeItem(BUSINESS_STORAGE_KEY)
  }
}

interface PendingVerification {
  user_id: UUID
  account_type: AccountType
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  business: BusinessSummary | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  registrationSuccessMessage: string | null
  pendingVerification: PendingVerification | null
  verificationStatus: 'idle' | 'loading' | 'succeeded' | 'failed'
  verificationError: string | null
  verificationSuccessMessage: string | null
}

const initialState: AuthState = {
  token: readTokenFromStorage(),
  user: null,
  business: readBusinessFromStorage(),
  status: 'idle',
  error: null,
  registrationSuccessMessage: null,
  pendingVerification: null,
  verificationStatus: 'idle',
  verificationError: null,
  verificationSuccessMessage: null,
}

const handleAuthFulfilled = (state: AuthState, payload: AuthResponse) => {
  const nextToken = payload.token ?? state.token ?? null
  const nextUser = payload.user ?? state.user
  const nextBusiness = payload.business ?? state.business ?? null

  state.token = nextToken
  state.user = nextUser ?? null
  state.business = nextBusiness
  state.status = 'succeeded'
  state.error = null
  state.pendingVerification = null
  writeTokenToStorage(nextToken)
  writeBusinessToStorage(nextBusiness)
}

const extractErrorPayload = (error: unknown) => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError
    if (axiosError.response) {
      return axiosError.response.data ?? axiosError.response.statusText
    }
    return axiosError.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return error
}

type RejectValue = unknown

const normalizeErrorMessage = (payload: unknown): string => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return 'Received an unexpected response from the server. Please confirm the backend is running.'
    }
    return trimmed || 'An unexpected error occurred. Please try again.'
  }
  if (payload && typeof payload === 'object') {
    const messageParts: string[] = []
    const entries = Object.entries(payload as Record<string, unknown>)
    entries.forEach(([key, value]) => {
      if (value == null) {
        messageParts.push(key)
        return
      }
      if (Array.isArray(value)) {
        messageParts.push(`${key}: ${value.join(', ')}`)
        return
      }
      if (typeof value === 'object') {
        messageParts.push(`${key}: ${JSON.stringify(value)}`)
        return
      }
      messageParts.push(`${key}: ${String(value)}`)
    })

    if (messageParts.length > 0) {
      return messageParts.join('\n')
    }
  }
  return 'An unexpected error occurred. Please try again.'
}

export const registerAccount = createAsyncThunk<
  RegisterAccountResponse,
  RegisterAccountPayload,
  { rejectValue: RejectValue }
>('auth/registerAccount', async (payload, thunkAPI) => {
  try {
    const response = await registerAccountRequest(payload)
    return response
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

export const registerBusiness = createAsyncThunk<
  AuthResponse,
  RegisterBusinessPayload,
  { rejectValue: RejectValue }
>('auth/registerBusiness', async (payload: RegisterBusinessPayload, thunkAPI) => {
  try {
    const response = await registerBusinessRequest(payload)
    return response
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

export const login = createAsyncThunk<
  AuthResponse,
  LoginPayload,
  { rejectValue: RejectValue }
>('auth/login', async (payload: LoginPayload, thunkAPI) => {
  try {
    const response = await loginRequest(payload)
    const authUser = response.user
    const authToken = response.token

    if (authUser?.account_type?.toUpperCase() === 'OWNER' && !response.business && authToken) {
      try {
        const businessesResponse: PaginatedResponse<Business> = await fetchBusinessesWithToken(authToken)
        const ownedBusiness = businessesResponse.results.find(
          (business: Business) => business.owner === authUser.id,
        )

        if (ownedBusiness) {
          return { ...response, business: ownedBusiness }
        }
      } catch (businessLookupError: unknown) {
        void businessLookupError
      }
    }

    return response
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  await logoutRequest()
})

export const verifyEmail = createAsyncThunk<
  VerifyEmailResponse,
  VerifyEmailPayload,
  { rejectValue: RejectValue }
>('auth/verifyEmail', async (payload: VerifyEmailPayload, thunkAPI) => {
  try {
    const response = await verifyEmailRequest(payload)
    return response
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

export const changePassword = createAsyncThunk<
  void,
  { old_password: string; new_password: string },
  { rejectValue: RejectValue }
>('auth/changePassword', async (payload, thunkAPI) => {
  try {
    await changePasswordRequest(payload)
    thunkAPI.dispatch(clearAuthSession(undefined))
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

export const fetchCurrentUser = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: RejectValue }
>('auth/fetchCurrentUser', async (_, thunkAPI) => {
  try {
    const response = await fetchCurrentUserRequest()
    return response
  } catch (error: unknown) {
    return thunkAPI.rejectWithValue(extractErrorPayload(error) as RejectValue)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthSession: (
      state: AuthState,
      action: PayloadAction<void | undefined>,
    ) => {
      void action
      state.token = null
      state.user = null
      state.business = null
      state.status = 'idle'
      state.error = null
      state.registrationSuccessMessage = null
      state.pendingVerification = null
      state.verificationStatus = 'idle'
      state.verificationError = null
      state.verificationSuccessMessage = null
      writeTokenToStorage(null)
      writeBusinessToStorage(null)
    },
    setAuthToken: (state: AuthState, action: PayloadAction<string | null>) => {
      state.token = action.payload
      writeTokenToStorage(action.payload)
    },
    resetAuthFeedback: (state: AuthState) => {
      state.status = 'idle'
      state.error = null
      state.registrationSuccessMessage = null
      state.pendingVerification = null
      state.verificationStatus = 'idle'
      state.verificationError = null
      state.verificationSuccessMessage = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerAccount.pending, (state: AuthState) => {
        state.status = 'loading'
        state.error = null
        state.registrationSuccessMessage = null
        state.pendingVerification = null
      })
      .addCase(
        registerAccount.fulfilled,
        (state: AuthState, action: PayloadAction<RegisterAccountResponse>) => {
          state.status = 'succeeded'
          const { message, detail, user_id, account_type } = action.payload
          state.pendingVerification = { user_id, account_type }
          state.registrationSuccessMessage =
            (typeof message === 'string' && message) || (typeof detail === 'string' ? detail : null) ||
            'Account created successfully. Please check your email to verify your account.'
        },
      )
      .addCase(
        registerAccount.rejected,
        (state: AuthState, action) => {
          state.status = 'failed'
          state.error = normalizeErrorMessage(action.payload)
        },
      )
      .addCase(registerBusiness.pending, (state: AuthState) => {
        state.status = 'loading'
        state.error = null
        state.registrationSuccessMessage = null
        state.pendingVerification = null
      })
      .addCase(
        registerBusiness.fulfilled,
        (state: AuthState, action: PayloadAction<AuthResponse>) => {
          handleAuthFulfilled(state, action.payload)
        },
      )
      .addCase(
        registerBusiness.rejected,
        (state: AuthState, action) => {
          state.status = 'failed'
          state.error = normalizeErrorMessage(action.payload)
        },
      )
      .addCase(login.pending, (state: AuthState) => {
        state.status = 'loading'
        state.error = null
        state.registrationSuccessMessage = null
        state.pendingVerification = null
      })
      .addCase(
        login.fulfilled,
        (state: AuthState, action: PayloadAction<AuthResponse>) => {
          const authUser = action.payload.user

          if (!authUser) {
            state.status = 'failed'
            state.error = 'Unable to load account details. Please try again.'
            return
          }

          if (!authUser.email_verified) {
            state.status = 'failed'
            state.error =
              'Email not verified. Please check your inbox for the verification link.'
            state.token = null
            state.user = null
            state.business = null
            state.pendingVerification = null
            writeTokenToStorage(null)
            writeBusinessToStorage(null)
            return
          }

          if (!authUser.is_active) {
            state.status = 'failed'
            state.error = 'User account is disabled.'
            state.token = null
            state.user = null
            state.business = null
            state.pendingVerification = null
            writeTokenToStorage(null)
            writeBusinessToStorage(null)
            return
          }

          handleAuthFulfilled(state, { ...action.payload, user: authUser })
        },
      )
      .addCase(
        login.rejected,
        (state: AuthState, action) => {
          state.status = 'failed'
          state.error = normalizeErrorMessage(action.payload)
        },
      )
      .addCase(logout.fulfilled, (state: AuthState) => {
        state.token = null
        state.user = null
        state.business = null
        state.status = 'idle'
        state.error = null
        state.pendingVerification = null
        writeTokenToStorage(null)
        writeBusinessToStorage(null)
      })
      .addCase(changePassword.pending, (state: AuthState) => {
        state.status = 'loading'
        state.error = null
        state.registrationSuccessMessage = null
        state.pendingVerification = null
        state.verificationStatus = 'idle'
        state.verificationError = null
        state.verificationSuccessMessage = null
      })
      .addCase(changePassword.fulfilled, (state: AuthState) => {
        state.status = 'succeeded'
      })
      .addCase(
        changePassword.rejected,
        (state: AuthState, action) => {
          state.status = 'failed'
          state.error = normalizeErrorMessage(action.payload)
        },
      )
      .addCase(fetchCurrentUser.pending, (state: AuthState) => {
        state.status = 'loading'
        state.registrationSuccessMessage = null
      })
      .addCase(
        fetchCurrentUser.fulfilled,
        (state: AuthState, action: PayloadAction<UserProfile>) => {
          state.user = action.payload
          state.status = 'succeeded'
          state.pendingVerification = null
        },
      )
      .addCase(
        fetchCurrentUser.rejected,
        (state: AuthState, action) => {
          state.status = 'failed'
          state.error = normalizeErrorMessage(action.payload)
          state.token = null
          state.user = null
          state.business = null
          state.pendingVerification = null
          writeTokenToStorage(null)
          writeBusinessToStorage(null)
        },
      )
      .addCase(verifyEmail.pending, (state: AuthState) => {
        state.verificationStatus = 'loading'
        state.verificationError = null
        state.verificationSuccessMessage = null
      })
      .addCase(
        verifyEmail.fulfilled,
        (state: AuthState, action: PayloadAction<VerifyEmailResponse>) => {
          state.verificationStatus = 'succeeded'
          const { message, detail } = action.payload
          state.verificationSuccessMessage =
            (typeof message === 'string' && message) || (typeof detail === 'string' ? detail : null) ||
            'Email verified successfully. You can now sign in.'
          state.pendingVerification = null
        },
      )
      .addCase(
        verifyEmail.rejected,
        (state: AuthState, action) => {
          state.verificationStatus = 'failed'
          state.verificationError = normalizeErrorMessage(action.payload)
        },
      )
  },
})

export const { clearAuthSession, setAuthToken, resetAuthFeedback } = authSlice.actions

export const selectAuthState = (state: RootState) => state.auth
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth.token)
export const selectCurrentUser = (state: RootState) => state.auth.user
export const selectCurrentBusiness = (state: RootState) => state.auth.business
export const selectPendingVerification = (state: RootState) => state.auth.pendingVerification
export const selectVerificationFeedback = (state: RootState) => ({
  status: state.auth.verificationStatus,
  error: state.auth.verificationError,
  message: state.auth.verificationSuccessMessage,
})

export default authSlice.reducer
