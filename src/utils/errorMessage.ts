import { isAxiosError, type AxiosError } from 'axios'

type ErrorCandidate = unknown

type ExtractMessagesOptions = {
  depth?: number
  maxDepth?: number
}

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.'

const TECHNICAL_PATTERNS: RegExp[] = [
  /\btraceback\b/i,
  /\bintegrityerror\b/i,
  /\bvalueerror\b/i,
  /\bkeyerror\b/i,
  /\boperationalerror\b/i,
  /\bprogrammingerror\b/i,
  /\bvalidationerror\b/i,
  /\bpsycopg2\b/i,
  /\bline \d+\b/i,
  /\bcolumn\b/i,
  /\bnot-null constraint\b/i,
  /\bnull value in column\b/i,
  /\bDETAIL:/i,
  /\bFile "\b/i,
  / at \/\S+/i,
  /Request Method:/i,
]

const DOMAIN_HINTS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /customer[_\s-]?id|customer is required|customer_id/i,
    message: 'Please select or create a customer before completing this sale.',
  },
  {
    pattern: /payment .*not provided|payment method/i,
    message: 'Please double-check the payment details and try again.',
  },
  {
    pattern: /permission denied|not permitted|not authorized/i,
    message: "You don't have permission to perform this action.",
  },
  {
    pattern: /insufficient\s+stock|available:\s*0|not enough stock/i,
    message: "That quantity isn't available right now. Please adjust the amount or choose another product.",
  },
]

const KNOWN_STATUS_MESSAGES: Record<number, string> = {
  400: 'Some required information is missing or invalid. Please review and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to perform this action.",
  404: "We couldn't find what you were looking for.",
  409: 'This action conflicts with existing data. Please refresh and try again.',
  500: 'The server had trouble completing your request. Please try again in a moment.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
}

const formatKey = (key: string): string => {
  if (!key) return ''
  const cleaned = key.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const normalizeWhitespace = (message: string): string => message.replace(/\s+/g, ' ').trim()

const hasTechnicalSignature = (message: string): boolean => {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message))
}

const applyDomainHints = (message: string): string | null => {
  const normalized = message.toLowerCase()
  for (const hint of DOMAIN_HINTS) {
    if (hint.pattern.test(normalized)) {
      return hint.message
    }
  }
  return null
}

const extractMessages = (
  candidate: ErrorCandidate,
  options: ExtractMessagesOptions = {},
): string[] => {
  const { depth = 0, maxDepth = 5 } = options
  if (depth > maxDepth || candidate == null) {
    return []
  }

  if (typeof candidate === 'string') {
    return [candidate]
  }

  if (candidate instanceof Error) {
    return [candidate.message]
  }

  if (Array.isArray(candidate)) {
    return candidate.flatMap((item) => extractMessages(item, { depth: depth + 1, maxDepth }))
  }

  if (isPlainObject(candidate)) {
    const orderedKeys = [
      'detail',
      'message',
      'error',
      'errors',
      'non_field_errors',
      '__all__',
      'info',
    ]

    const collected: string[] = []

    for (const key of orderedKeys) {
      if (key in candidate) {
        const messages = extractMessages(candidate[key], { depth: depth + 1, maxDepth })
        collected.push(...messages)
      }
    }

    const remainingEntries = Object.entries(candidate).filter(
      ([key]) => !orderedKeys.includes(key),
    )

    for (const [key, value] of remainingEntries) {
      const nestedMessages = extractMessages(value, { depth: depth + 1, maxDepth })
      if (nestedMessages.length === 0) {
        continue
      }
      const label = formatKey(key)
      nestedMessages.forEach((nested) => {
        if (label) {
          collected.push(`${label}: ${nested}`)
        } else {
          collected.push(nested)
        }
      })
    }

    return collected
  }

  if (typeof candidate === 'number' || typeof candidate === 'boolean') {
    return [String(candidate)]
  }

  return []
}

interface FriendlyErrorOptions {
  fallback?: string
}

export const toUserFacingError = (
  error: unknown,
  options: FriendlyErrorOptions = {},
): string => {
  const fallback = options.fallback ?? DEFAULT_FALLBACK
  let status: number | undefined
  let payload: unknown = error

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError
    status = axiosError.response?.status
    payload = axiosError.response?.data ?? axiosError.message
  }

  const messages = extractMessages(payload)

  for (const rawMessage of messages) {
    const normalized = normalizeWhitespace(rawMessage)
    if (!normalized) {
      continue
    }

    const hint = applyDomainHints(normalized)
    if (hint) {
      return hint
    }

    if (!hasTechnicalSignature(normalized)) {
      return normalized
    }
  }

  if (status && status in KNOWN_STATUS_MESSAGES) {
    return KNOWN_STATUS_MESSAGES[status]
  }

  const hintFromPayload =
    typeof payload === 'string' ? applyDomainHints(payload) : null
  if (hintFromPayload) {
    return hintFromPayload
  }

  return fallback
}

export const ensureUserFacingError = (
  message: unknown,
  fallback?: string,
): string => {
  if (typeof message === 'string') {
    const normalized = normalizeWhitespace(message)
    if (!normalized || hasTechnicalSignature(normalized)) {
      const hint = applyDomainHints(normalized)
      return hint ?? (fallback ?? DEFAULT_FALLBACK)
    }
    return normalized
  }

  return toUserFacingError(message, { fallback })
}
