import '@testing-library/jest-dom/vitest'
import i18n from '../i18n'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom does not implement scrolling.
window.scrollTo = vi.fn()

// Every test starts in English, whatever the machine's language is.
beforeEach(() => i18n.changeLanguage('en'))
afterEach(() => cleanup())
