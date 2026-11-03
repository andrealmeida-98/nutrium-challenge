import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'
import LanguageSwitcher from './LanguageSwitcher'

// Green band at the top of every page: logo, link for professionals, language and (optionally) the search form.
export default function Hero({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()

  return (
    <header className="bg-gradient-to-b from-hero-from to-hero-to text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between gap-4 py-5">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-wide">
            <span aria-hidden="true">♥</span>
            nutrium
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/professionals" className="hidden items-center gap-2 text-sm sm:flex">
              {t('header.professionals')}
              <ArrowRightIcon className="text-base" />
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
        {children && <div className="pb-9 pt-4">{children}</div>}
      </div>
    </header>
  )
}
