import { request } from './client'
import type { AppointmentRequest, NewAppointmentRequest } from './types'

export function createAppointmentRequest(data: NewAppointmentRequest) {
  return request<AppointmentRequest>('/appointment_requests', { method: 'POST', body: JSON.stringify(data) })
}

export function answerAppointmentRequest(id: number, answer: 'accept' | 'reject') {
  return request<AppointmentRequest>(`/appointment_requests/${id}/${answer}`, { method: 'PATCH' })
}
