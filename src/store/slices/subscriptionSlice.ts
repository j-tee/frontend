import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { toUserFacingError } from '../../utils/errorMessage'
import { fetchSubscriptions } from '../../services/subscriptionService.js'
import type { Subscription } from '../../types/subscriptions.js'
import type { RootState } from '../index.js'

interface SubscriptionState {
  activeSubscription: Subscription | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  gateMessage: string | null
  isGateVisible: boolean
}

const initialState: SubscriptionState = {
  activeSubscription: null,
  status: 'idle',
  error: null,
  gateMessage: null,
  isGateVisible: false,
}

const extractErrorMessage = (error: unknown, fallback = 'Unable to load subscription details right now. Please try again.') =>
  toUserFacingError(error, { fallback })

type RejectValue = string | Record<string, unknown>

export const loadActiveSubscription = createAsyncThunk<
  Subscription | null,
  void,
  { rejectValue: RejectValue }
>('subscription/loadActive', async (_, thunkAPI) => {
  try {
    const response = await fetchSubscriptions('ACTIVE')
    const [subscription] = response.results
    return subscription ?? null
  } catch (error: unknown) {
  return thunkAPI.rejectWithValue(extractErrorMessage(error) as RejectValue)
  }
})

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    hideSubscriptionGate: (state: SubscriptionState) => {
      state.isGateVisible = false
      state.gateMessage = null
    },
    showSubscriptionGate: (
      state: SubscriptionState,
      action: PayloadAction<string | null>,
    ) => {
      state.isGateVisible = true
      state.gateMessage = action.payload ?? 'Subscription required to continue.'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadActiveSubscription.pending, (state: SubscriptionState) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(
        loadActiveSubscription.fulfilled,
        (state: SubscriptionState, action: PayloadAction<Subscription | null>) => {
          state.activeSubscription = action.payload
          state.status = 'succeeded'
          if (action.payload?.status === 'ACTIVE') {
            state.isGateVisible = false
            state.gateMessage = null
          }
        },
      )
      .addCase(
        loadActiveSubscription.rejected,
        (state: SubscriptionState, action: PayloadAction<RejectValue | undefined>) => {
          state.status = 'failed'
          state.error = (typeof action.payload === 'string' ? action.payload : null)
        },
      )
  },
})

export const { hideSubscriptionGate, showSubscriptionGate } = subscriptionSlice.actions

export const selectSubscriptionState = (state: RootState) => state.subscription
export const selectActiveSubscription = (state: RootState) =>
  state.subscription.activeSubscription
export const selectIsSubscriptionGateVisible = (state: RootState) =>
  state.subscription.isGateVisible
export const selectSubscriptionGateMessage = (state: RootState) =>
  state.subscription.gateMessage

export default subscriptionSlice.reducer
