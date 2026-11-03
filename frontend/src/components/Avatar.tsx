import { initials } from '../lib/format'

const COLOURS = ['bg-sky-300', 'bg-emerald-400', 'bg-amber-300', 'bg-rose-300', 'bg-violet-300', 'bg-teal-400']

// There are no photos, so the avatar is a coloured circle with the initials.
export default function Avatar({ name, className = 'size-20 text-2xl' }: { name: string; className?: string }) {
  const colour = COLOURS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLOURS.length]
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${colour} ${className}`}
    >
      {initials(name)}
    </div>
  )
}
