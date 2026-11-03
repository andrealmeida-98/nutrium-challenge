import 'i18next'
import type en from './en'

// Makes `t('some.key')` check the key against the English file.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
