export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers.
 * Supports:
 * - Nigerian local format: 11 digits (e.g., 08031234567, 08165413812, 09012345678, 070..., 091...)
 * - Nigerian international format: +234... or 234... (e.g., +2348165413812)
 * - Standard international format: +[country_code][national_number] (8 to 15 digits total)
 */
export function validatePhoneNumber(phone: string): PhoneValidationResult {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Phone number is required.' };
  }

  // Remove spaces, hyphens, parentheses, and dots
  const cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');

  // 1. Nigerian local format: 11 digits starting with 070, 080, 081, 090, 091, 071, etc.
  if (/^0[789][01]\d{8}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: '+234' + cleaned.slice(1)
    };
  }

  // 2. Nigerian international format with leading +234
  if (/^\+234[789][01]\d{8}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: cleaned
    };
  }

  // 3. Nigerian international format with leading 234 without +
  if (/^234[789][01]\d{8}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: '+' + cleaned
    };
  }

  // 4. Other valid international E.164 phone numbers (+ followed by 8 to 15 digits)
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return {
      isValid: true,
      normalized: cleaned
    };
  }

  // Specific helpful error messages for common mistakes:
  if (/^0[789][01]\d{7}$/.test(cleaned)) {
    return {
      isValid: false,
      error: `Incomplete number (${cleaned.length} digits). Nigerian phone numbers must be exactly 11 digits (e.g. 0816 541 3812).`
    };
  }

  if (cleaned.startsWith('0') && cleaned.length < 11) {
    return {
      isValid: false,
      error: `Too short (${cleaned.length}/11 digits). Enter full 11-digit number (e.g. 08012345678).`
    };
  }

  if (cleaned.startsWith('0') && cleaned.length > 11) {
    return {
      isValid: false,
      error: `Too long (${cleaned.length} digits). Nigerian local numbers must be exactly 11 digits.`
    };
  }

  if (cleaned.startsWith('+') && cleaned.length < 10) {
    return {
      isValid: false,
      error: 'International number is too short. Include country code and full phone number.'
    };
  }

  return {
    isValid: false,
    error: 'Invalid format. Use an 11-digit number (e.g. 08012345678) or international (+234...).'
  };
}
