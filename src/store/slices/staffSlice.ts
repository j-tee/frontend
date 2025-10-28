import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import type { RootState } from '../index.js'
import {
  createInvitation,
  deleteMembership,
  fetchInvitations,
  fetchMemberships,
  resendInvitation,
  revokeInvitation,
  updateMembership,
  updateMembershipStorefronts,
} from '../../services/staffService.js'
import type {
  BusinessInvitation,
  CreateInvitationPayload,
  Membership,
  MembershipStorefrontUpdatePayload,
  MembershipUpdatePayload,
} from '../../types/employees.js'

const DEFAULT_PAGE_SIZE = 20

export interface PaginationState {
  count: number
  next: string | null
  previous: string | null
  page: number
  pageSize: number
}

export type RequestStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface StaffState {
  invitations: BusinessInvitation[]
  invitationsStatus: RequestStatus
  invitationsError: string | null
  invitationPagination: PaginationState

  memberships: Membership[]
  membershipsStatus: RequestStatus
  membershipsError: string | null
  membershipPagination: PaginationState

  inviteStatus: RequestStatus
  inviteError: string | null

  resendStatuses: Record<string, RequestStatus>
  revokeStatuses: Record<string, RequestStatus>
  assignmentStatuses: Record<string, RequestStatus>
  membershipUpdateStatuses: Record<string, RequestStatus>
  membershipRemovalStatuses: Record<string, RequestStatus>
}

const initialPagination: PaginationState = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
}

const initialState: StaffState = {
  invitations: [],
  invitationsStatus: 'idle',
  invitationsError: null,
  invitationPagination: initialPagination,

  memberships: [],
  membershipsStatus: 'idle',
  membershipsError: null,
  membershipPagination: initialPagination,

  inviteStatus: 'idle',
  inviteError: null,

  resendStatuses: {},
  revokeStatuses: {},
  assignmentStatuses: {},
  membershipUpdateStatuses: {},
  membershipRemovalStatuses: {},
}

const MAX_ERROR_MESSAGE_LENGTH = 180

const formatStatusMessage = (status?: number, statusText?: string | null) => {
  if (status) {
    const label = statusText?.trim()
    return label ? `Request failed with status ${status}: ${label}.` : `Request failed with status ${status}.`
  }
  return 'Request failed. Please try again later.'
}

const flattenErrorValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const flattened = flattenErrorValue(entry)
      if (flattened) return flattened
    }
    return null
  }
  if (value && typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const flattened = flattenErrorValue(entry)
      if (flattened) return flattened
    }
  }
  return null
}

const sanitiseMessage = (message: string, fallback: string) => {
  const trimmed = message.trim()
  if (!trimmed) return fallback
  const firstLine = trimmed.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (!firstLine) return fallback
  if (/^<!?DOCTYPE/i.test(firstLine) || /^<html/i.test(firstLine)) return fallback
  if (/traceback/i.test(trimmed) || /exception/i.test(trimmed)) {
    return fallback
  }
  if (firstLine.length > MAX_ERROR_MESSAGE_LENGTH) {
    return fallback
  }
  return firstLine
}

const extractError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const response = error.response
    if (response?.data !== undefined) {
      if (typeof response.data === 'string') {
        const fallback = formatStatusMessage(response.status, response.statusText)
        return sanitiseMessage(response.data, fallback)
      }

      if (response.data && typeof response.data === 'object') {
        const record = response.data as Record<string, unknown>
        const candidateKeys = ['detail', 'message', 'error', 'errors']
        for (const key of candidateKeys) {
          const candidate = flattenErrorValue(record[key])
          if (candidate) {
            const fallback = formatStatusMessage(response.status, response.statusText)
            return sanitiseMessage(candidate, fallback)
          }
        }
        const fallback = formatStatusMessage(response.status, response.statusText)
        const serialised = (() => {
          try {
            return JSON.stringify(response.data)
          } catch {
            return null
          }
        })()
        if (serialised) {
          return sanitiseMessage(serialised, fallback)
        }
        return fallback
      }
    }

    if (response) {
      return formatStatusMessage(response.status, response.statusText)
    }
    return error.message
  }

  if (error instanceof Error) return sanitiseMessage(error.message, 'An unexpected error occurred.')
  if (typeof error === 'string') return sanitiseMessage(error, 'An unexpected error occurred.')
  return 'An unexpected error occurred.'
}

const getBusinessIdOrThrow = (state: RootState): string => {
  const businessId = state.auth.business?.id
  if (!businessId) {
    throw new Error('Business context is unavailable.')
  }
  return businessId
}

interface LoadPageArgs {
  page?: number
}

export const loadInvitations = createAsyncThunk(
  'staff/loadInvitations',
  async (args: LoadPageArgs | undefined, thunkAPI) => {
    try {
      const page = args?.page ?? 1
      const businessId = getBusinessIdOrThrow(thunkAPI.getState() as RootState)
      const data = await fetchInvitations(businessId, { page })
      return { data, page }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

export const loadMemberships = createAsyncThunk(
  'staff/loadMemberships',
  async (args: LoadPageArgs | undefined, thunkAPI) => {
    try {
      const page = args?.page ?? 1
      const businessId = getBusinessIdOrThrow(thunkAPI.getState() as RootState)
      const data = await fetchMemberships(businessId, { page })
      return { data, page }
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

export const inviteEmployee = createAsyncThunk(
  'staff/inviteEmployee',
  async (payload: CreateInvitationPayload, thunkAPI) => {
    try {
      const businessId = getBusinessIdOrThrow(thunkAPI.getState() as RootState)
      return await createInvitation(businessId, payload)
    } catch (error) {
      return thunkAPI.rejectWithValue(extractError(error))
    }
  },
)

export const resendEmployeeInvitation = createAsyncThunk(
  'staff/resendEmployeeInvitation',
  async (invitationId: string, thunkAPI) => {
    try {
      await resendInvitation(invitationId)
      return invitationId
    } catch (error) {
      return thunkAPI.rejectWithValue({ id: invitationId, message: extractError(error) })
    }
  },
)

export const revokeEmployeeInvitation = createAsyncThunk(
  'staff/revokeEmployeeInvitation',
  async (invitationId: string, thunkAPI) => {
    try {
      const updated = await revokeInvitation(invitationId)
      return updated
    } catch (error) {
      return thunkAPI.rejectWithValue({ id: invitationId, message: extractError(error) })
    }
  },
)

export const updateMemberAssignments = createAsyncThunk(
  'staff/updateMemberAssignments',
  async (
    { membershipId, storefronts }: { membershipId: string; storefronts: string[] },
    thunkAPI,
  ) => {
    try {
      const payload: MembershipStorefrontUpdatePayload = { storefronts }
      const updated = await updateMembershipStorefronts(membershipId, payload)
      return updated
    } catch (error) {
      return thunkAPI.rejectWithValue({ id: membershipId, message: extractError(error) })
    }
  },
)

export const updateMemberDetails = createAsyncThunk(
  'staff/updateMemberDetails',
  async (
    { membershipId, updates }: { membershipId: string; updates: MembershipUpdatePayload },
    thunkAPI,
  ) => {
    try {
      const updated = await updateMembership(membershipId, updates)
      return updated
    } catch (error) {
      return thunkAPI.rejectWithValue({ id: membershipId, message: extractError(error) })
    }
  },
)

export const removeMember = createAsyncThunk(
  'staff/removeMember',
  async (membershipId: string, thunkAPI) => {
    try {
      await deleteMembership(membershipId)
      return membershipId
    } catch (error) {
      return thunkAPI.rejectWithValue({ id: membershipId, message: extractError(error) })
    }
  },
)

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    resetInviteState: (state) => {
      state.inviteStatus = 'idle'
      state.inviteError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadInvitations.pending, (state) => {
        state.invitationsStatus = 'loading'
        state.invitationsError = null
      })
      .addCase(loadInvitations.fulfilled, (state, action) => {
        state.invitationsStatus = 'succeeded'
        state.invitations = action.payload.data.results
        state.invitationPagination = {
          count: action.payload.data.count,
          next: action.payload.data.next,
          previous: action.payload.data.previous,
          page: action.payload.page,
          pageSize: DEFAULT_PAGE_SIZE,
        }
      })
      .addCase(loadInvitations.rejected, (state, action) => {
        state.invitationsStatus = 'failed'
        state.invitationsError = (action.payload as string) ?? 'Unable to load invitations.'
      })

      .addCase(loadMemberships.pending, (state) => {
        state.membershipsStatus = 'loading'
        state.membershipsError = null
      })
      .addCase(loadMemberships.fulfilled, (state, action) => {
        state.membershipsStatus = 'succeeded'
        state.memberships = action.payload.data.results
        state.membershipPagination = {
          count: action.payload.data.count,
          next: action.payload.data.next,
          previous: action.payload.data.previous,
          page: action.payload.page,
          pageSize: DEFAULT_PAGE_SIZE,
        }
      })
      .addCase(loadMemberships.rejected, (state, action) => {
        state.membershipsStatus = 'failed'
        state.membershipsError = (action.payload as string) ?? 'Unable to load memberships.'
      })

      .addCase(inviteEmployee.pending, (state) => {
        state.inviteStatus = 'loading'
        state.inviteError = null
      })
      .addCase(inviteEmployee.fulfilled, (state) => {
        state.inviteStatus = 'succeeded'
      })
      .addCase(inviteEmployee.rejected, (state, action) => {
        state.inviteStatus = 'failed'
        state.inviteError = (action.payload as string) ?? 'Unable to send invitation.'
      })

      .addCase(resendEmployeeInvitation.pending, (state, action) => {
        const id = action.meta.arg
        state.resendStatuses[id] = 'loading'
      })
      .addCase(resendEmployeeInvitation.fulfilled, (state, action) => {
        const id = action.payload
        state.resendStatuses[id] = 'succeeded'
      })
      .addCase(resendEmployeeInvitation.rejected, (state, action) => {
        const payload = action.payload as { id: string; message: string } | undefined
        if (payload) {
          state.resendStatuses[payload.id] = 'failed'
        }
      })

      .addCase(revokeEmployeeInvitation.pending, (state, action) => {
        const id = action.meta.arg
        state.revokeStatuses[id] = 'loading'
      })
      .addCase(revokeEmployeeInvitation.fulfilled, (state, action: PayloadAction<BusinessInvitation>) => {
        const updated = action.payload
        state.revokeStatuses[updated.id] = 'succeeded'
        state.invitations = state.invitations.map((invitation) =>
          invitation.id === updated.id ? updated : invitation,
        )
      })
      .addCase(revokeEmployeeInvitation.rejected, (state, action) => {
        const payload = action.payload as { id: string; message: string } | undefined
        if (payload) {
          state.revokeStatuses[payload.id] = 'failed'
        }
      })

      .addCase(updateMemberAssignments.pending, (state, action) => {
        const id = action.meta.arg.membershipId
        state.assignmentStatuses[id] = 'loading'
      })
      .addCase(updateMemberAssignments.fulfilled, (state, action: PayloadAction<Membership>) => {
        const updated = action.payload
        state.assignmentStatuses[updated.id] = 'succeeded'
        state.memberships = state.memberships.map((membership) =>
          membership.id === updated.id ? updated : membership,
        )
      })
      .addCase(updateMemberAssignments.rejected, (state, action) => {
        const payload = action.payload as { id: string; message: string } | undefined
        if (payload) {
          state.assignmentStatuses[payload.id] = 'failed'
        }
      })

      .addCase(updateMemberDetails.pending, (state, action) => {
        const id = action.meta.arg.membershipId
        state.membershipUpdateStatuses[id] = 'loading'
      })
      .addCase(updateMemberDetails.fulfilled, (state, action: PayloadAction<Membership>) => {
        const updated = action.payload
        state.membershipUpdateStatuses[updated.id] = 'succeeded'
        state.memberships = state.memberships.map((membership) =>
          membership.id === updated.id ? updated : membership,
        )
      })
      .addCase(updateMemberDetails.rejected, (state, action) => {
        const payload = action.payload as { id: string; message: string } | undefined
        if (payload) {
          state.membershipUpdateStatuses[payload.id] = 'failed'
        }
      })

      .addCase(removeMember.pending, (state, action) => {
        const id = action.meta.arg
        state.membershipRemovalStatuses[id] = 'loading'
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        const id = action.payload
        state.membershipRemovalStatuses[id] = 'succeeded'
        state.memberships = state.memberships.filter((membership) => membership.id !== id)
        state.membershipPagination = {
          ...state.membershipPagination,
          count: Math.max(0, state.membershipPagination.count - 1),
        }
      })
      .addCase(removeMember.rejected, (state, action) => {
        const payload = action.payload as { id: string; message: string } | undefined
        if (payload) {
          state.membershipRemovalStatuses[payload.id] = 'failed'
        }
      })
  },
})

export const { resetInviteState } = staffSlice.actions

export const selectStaffState = (state: RootState) => state.staff
export const selectStaffInvitations = (state: RootState) => state.staff.invitations
export const selectStaffInvitationPagination = (state: RootState) => state.staff.invitationPagination
export const selectStaffInvitationStatus = (state: RootState) => state.staff.invitationsStatus
export const selectStaffInvitationError = (state: RootState) => state.staff.invitationsError

export const selectStaffMemberships = (state: RootState) => state.staff.memberships
export const selectStaffMembershipPagination = (state: RootState) => state.staff.membershipPagination
export const selectStaffMembershipStatus = (state: RootState) => state.staff.membershipsStatus
export const selectStaffMembershipError = (state: RootState) => state.staff.membershipsError

export const selectInviteStatus = (state: RootState) => state.staff.inviteStatus
export const selectInviteError = (state: RootState) => state.staff.inviteError

export const selectInvitationResendStatus = (state: RootState) => state.staff.resendStatuses
export const selectInvitationRevokeStatus = (state: RootState) => state.staff.revokeStatuses
export const selectAssignmentStatuses = (state: RootState) => state.staff.assignmentStatuses

export default staffSlice.reducer
