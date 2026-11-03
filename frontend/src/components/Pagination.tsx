type Props = { page: number; totalPages: number; onChange: (page: number) => void }

// Pages to show: all of them when there are few, otherwise a window around the current one.
export function visiblePages(page: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const start = Math.min(Math.max(page - 2, 1), totalPages - 4)
  return Array.from({ length: 5 }, (_, i) => start + i)
}

const base = 'flex size-8 items-center justify-center text-sm disabled:opacity-40'

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pagination" className="inline-flex bg-white text-muted shadow-sm">
      <button type="button" className={base} disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        &lt;
      </button>
      {visiblePages(page, totalPages).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`${base} ${n === page ? 'bg-brand-soft text-brand' : ''}`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={base}
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        &gt;
      </button>
    </nav>
  )
}
