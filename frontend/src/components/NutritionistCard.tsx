import { useState } from 'react'
import type { Nutritionist, Service } from '../api/types'
import { formatDistance, formatPrice } from '../lib/format'
import Avatar from './Avatar'
import { BriefcaseIcon, ChevronDownIcon, MoneyIcon, PinIcon, StarIcon } from './icons'

type Props = {
  nutritionist: Nutritionist
  fromCity: string
  onSchedule: (nutritionist: Nutritionist, service: Service) => void
}

export default function NutritionistCard({ nutritionist, fromCity, onSchedule }: Props) {
  const [serviceId, setServiceId] = useState(nutritionist.services[0].id)
  const service = nutritionist.services.find((s) => s.id === serviceId) ?? nutritionist.services[0]

  return (
    <article className="flex flex-col gap-6 rounded-sm bg-white p-8 shadow-sm md:flex-row md:justify-between">
      <div className="flex gap-6">
        <Avatar name={nutritionist.name} className="size-24 text-3xl" />

        <div>
          {/* Decorative, as in the mockup: there is no "follow" feature (see README). */}
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-0.5 text-xs font-bold uppercase text-brand">
            <StarIcon /> Follow-up
          </span>
          <h2 className="text-2xl font-medium text-brand">{nutritionist.name}</h2>
          <p className="text-sm text-ink">Dietitian • {nutritionist.license_number}</p>

          <div className="mt-6 grid gap-x-24 gap-y-3 text-sm md:grid-cols-2">
            <div className="flex gap-3">
              <PinIcon className="mt-0.5 shrink-0 text-lg text-brand" />
              <div className="space-y-2">
                <p className="font-bold text-brand">{service.city}</p>
                <p>
                  {formatDistance(service.distance_km)} from {fromCity}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <BriefcaseIcon className="shrink-0 text-lg text-brand" />
                <label className="relative">
                  <span className="sr-only">Service</span>
                  <select
                    value={service.id}
                    onChange={(e) => setServiceId(Number(e.target.value))}
                    className="cursor-pointer appearance-none bg-transparent pr-5 outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {nutritionist.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2" />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <MoneyIcon className="shrink-0 text-lg text-brand" />
                <span>
                  {formatPrice(service.price_cents)} · {service.duration_minutes} min
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 md:w-72">
        <button
          type="button"
          onClick={() => onSchedule(nutritionist, service)}
          className="rounded-sm bg-accent-soft px-4 py-3 text-sm text-accent-text hover:brightness-95"
        >
          Schedule appointment
        </button>
        {/* Placeholder: the challenge allows this button to do nothing. */}
        <button type="button" className="rounded-sm bg-brand-soft px-4 py-3 text-sm text-brand hover:brightness-95">
          Website
        </button>
      </div>
    </article>
  )
}
