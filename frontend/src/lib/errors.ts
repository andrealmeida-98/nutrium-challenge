import type { TFunction } from 'i18next'
import { ApiError } from '../api/client'

// Text for an error, in the page's language. The API's own messages are English,
// so what we show depends on the kind of error and not on the API's text.
export function errorText(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('errors.network')
    if (error.status === 404) return t('errors.notFound')
    if (error.status === 409) return t('errors.alreadyAnswered')
  }
  return t('errors.generic')
}

const VALIDATION_MESSAGES = {
  "can't be blank": 'blank',
  'is invalid': 'invalid',
  'must be in the future': 'inThePast',
  'is not available': 'unavailable',
} as const

const FIELDS = ['guest_name', 'guest_email', 'starts_at', 'service'] as const

// "Name can't be blank", "Date and time is not available"... One message per field:
// a blank email would otherwise say "can't be blank" and "is invalid".
// Messages we do not know are shown as they come.
export function validationTexts(details: Record<string, string[]>, t: TFunction): string[] {
  return Object.entries(details).map(([field, messages]) => {
    const known = VALIDATION_MESSAGES[messages[0] as keyof typeof VALIDATION_MESSAGES]
    const fieldName = (FIELDS as readonly string[]).includes(field) ? t(`validation.fields.${field as (typeof FIELDS)[number]}`) : field
    const message = known ? t(`validation.messages.${known}`) : messages[0]
    return t('validation.format', { field: fieldName, message })
  })
}
