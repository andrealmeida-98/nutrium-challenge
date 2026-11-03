import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightIcon } from './icons'

// Green band at the top of every page: logo, link for professionals and (optionally) the search form.
export default function Hero({ children }: { children?: ReactNode }) {
  return (
    <header className="bg-gradient-to-b from-hero-from to-hero-to text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center justify-between py-5">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-wide">
            <span aria-hidden="true">♥</span>
            nutrium
          </Link>
          <Link to="/professionals" className="hidden items-center gap-2 text-sm sm:flex">
            Are you a nutrition professional? Get to know our software
            <ArrowRightIcon className="text-base" />
          </Link>
        </div>
        {children && <div className="pb-9 pt-4">{children}</div>}
      </div>
    </header>
  )
}
