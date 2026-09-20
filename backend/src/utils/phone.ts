/**
 * Normalize Indian phone numbers to a consistent format.
 * Accepted input formats:
 *   +91XXXXXXXXXX
 *   91XXXXXXXXXX (12 digits total)
 *   XXXXXXXXXX (10 digits)
 * Returns: +91XXXXXXXXXX (with country code)
 * Returns null if invalid.
 */
export function normalizeIndianPhone(input: string): string | null {
  const trimmed = input.trim()

  // Remove all non-digit characters except leading +
  const digitsOnly = trimmed.replace(/[^\d+]/g, '')

  // Case 1: Already starts with +91
  if (digitsOnly.startsWith('+91')) {
    const rest = digitsOnly.slice(3)
    if (rest.length === 10 && /^\d{10}$/.test(rest) && isValidIndianMobilePrefix(rest[0])) {
      return `+91${rest}`
    }
    return null
  }

  // Case 2: Starts with 91 (without +) - must be 12 digits total (91 + 10 digits)
  // Do NOT match 10-digit numbers starting with 91 (like 9136787194) as having a 91 prefix
  if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
    const rest = digitsOnly.slice(2)
    if (rest.length === 10 && /^\d{10}$/.test(rest) && isValidIndianMobilePrefix(rest[0])) {
      return `+91${rest}`
    }
    return null
  }

  // Case 3: Just 10 digits (standard Indian mobile number)
  if (/^\d{10}$/.test(digitsOnly) && isValidIndianMobilePrefix(digitsOnly[0])) {
    return `+91${digitsOnly}`
  }

  return null
}

/**
 * Check if the first digit is a valid Indian mobile prefix (6, 7, 8, or 9)
 */
function isValidIndianMobilePrefix(firstDigit: string): boolean {
  return ['6', '7', '8', '9'].includes(firstDigit)
}

/**
 * Check if a phone number is valid (Indian format).
 * Does not normalize - just validates.
 */
export function isValidIndianPhone(input: string): boolean {
  return normalizeIndianPhone(input) !== null
}

/**
 * Format phone for display: +91 XXXXX XXXXX
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizeIndianPhone(phone)
  if (!normalized) return phone
  const digits = normalized.slice(3) // remove +91
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}