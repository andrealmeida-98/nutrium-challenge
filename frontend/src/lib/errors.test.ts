import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import i18n from '../i18n'
import { errorText, validationTexts } from './errors'

const details = { guest_email: ["can't be blank", 'is invalid'], starts_at: ['is not available'], guest_name: ['custom message'] }

describe('errorText', () => {
  it('depends on the kind of error, not on the text the API sent', () => {
    const t = i18n.getFixedT('en')
    expect(errorText(new ApiError(0, 'x'), t)).toBe('Could not reach the server. Is the API running?')
    expect(errorText(new ApiError(404, 'Not found'), t)).toBe('Not found')
    expect(errorText(new ApiError(409, 'request is accepted, not pending'), t)).toBe('This request was already answered.')
    expect(errorText(new ApiError(500, 'Boom'), t)).toBe('Something went wrong. Please try again.')
    expect(errorText(new Error('anything'), t)).toBe('Something went wrong. Please try again.')
  })

  it('is translated', () => {
    expect(errorText(new ApiError(409, ''), i18n.getFixedT('pt'))).toBe('Este pedido já foi respondido.')
  })
})

describe('validationTexts', () => {
  it('shows one message per field, in English', () => {
    expect(validationTexts(details, i18n.getFixedT('en'))).toEqual([
      "Email can't be blank",
      'Date and time is not available',
      'Name custom message', // a message we do not know is shown as it came
    ])
  })

  it('translates the messages we know, in Portuguese', () => {
    expect(validationTexts(details, i18n.getFixedT('pt'))).toEqual([
      'Email: não pode ficar em branco',
      'Data e hora: não está disponível',
      'Nome: custom message',
    ])
  })

  it('shows the field as it came when it is not one we know', () => {
    expect(validationTexts({ other: ['is invalid'] }, i18n.getFixedT('en'))).toEqual(['other is invalid'])
  })
})
