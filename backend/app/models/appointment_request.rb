class AppointmentRequest < ApplicationRecord
  belongs_to :service

  enum :status, {
    pending: "pending",
    accepted: "accepted",
    rejected: "rejected",
    cancelled: "cancelled"
  }

  normalizes :guest_email, with: ->(email) { email.strip.downcase }

  validates :guest_name, presence: true
  validates :guest_email, presence: true
  validates :starts_at, presence: true
  validates :guest_email, format:{ with: URI::MailTo::EMAIL_REGEXP }
  validate :no_accepted_overlap, on: :create

  before_validation :set_ends_at

  # Pedidos de uma nutricionista (JOIN com services, que tem a FK).
  scope :for_nutritionist, ->(nutritionist_id) {
    joins(:service).where(services: { nutritionist_id: nutritionist_id })
  }

  # Intervalos [início, fim) que se sobrepõem. 10-11 e 11-12 NÃO colidem.
  scope :overlapping, ->(starts_at, ends_at) {
    where("appointment_requests.starts_at < ? AND ? < appointment_requests.ends_at", ends_at, starts_at)
  }

  # Novo pedido cancela os pendentes anteriores do mesmo email.
  def self.submit!(service:, guest_name:, guest_email:, starts_at:)
    request = new(service: service, guest_name: guest_name, guest_email: guest_email, starts_at: starts_at)

    # with_lock = transação + bloqueio da nutricionista (evita pedidos simultâneos).
    # Se algo falhar, a transação desfaz tudo, inclusive o cancelamento.
    service.nutritionist.with_lock do
      # update_all: um só UPDATE, sem validações nem callbacks (updated_at à mão).
      pending.where(guest_email: request.guest_email)
             .update_all(status: :cancelled, updated_at: Time.current)

      request.save! # rebenta se for inválido ou colidir com um aceite
    end

    request
  end

  private

  # Bloqueia pedidos que colidem com um já aceite da mesma nutricionista.
  def no_accepted_overlap
    return unless service && starts_at && ends_at

    clash = AppointmentRequest.accepted
                              .for_nutritionist(service.nutritionist_id)
                              .overlapping(starts_at, ends_at)
                              .exists?

    errors.add(:starts_at, "is not available") if clash
  end

  def set_ends_at
    return unless starts_at && service

    self.ends_at = starts_at + service.duration_minutes.minutes
  end
end
