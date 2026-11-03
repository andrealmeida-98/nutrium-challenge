class AppointmentRequest < ApplicationRecord
  # Lançada ao tentar aceitar/rejeitar um pedido que já não está pendente.
  class InvalidTransition < StandardError; end

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
  validate :starts_at_in_future, on: :create
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

    # Se algo falhar, a transação desfaz tudo, inclusive o cancelamento.
    transaction do
      # 1.º lock: o email. Dois pedidos do mesmo email (mesmo para nutricionistas
      # diferentes) passam a correr um a seguir ao outro, e o último cancela o
      # primeiro. Sem isto, o índice único rebentava com RecordNotUnique.
      # Lock "advisory" = trava com um número nosso (hash do email), libertada
      # sozinha no fim da transação.
      lock_guest_email!(request.guest_email)

      # 2.º lock: a nutricionista (evita dois pedidos a colidir com o mesmo aceite).
      # Ordem fixa (email -> nutricionista) para evitar deadlocks.
      service.nutritionist.with_lock do
        # update_all: um só UPDATE, sem validações nem callbacks (updated_at à mão).
        pending.where(guest_email: request.guest_email)
               .update_all(status: :cancelled, updated_at: Time.current)

        request.save! # rebenta se for inválido ou colidir com um aceite
      end
    end

    request
  end

  # Nutricionista rejeita o pedido. (Regra 4: o guest recebe email; o job só
  # entra na fila depois do commit - ver config/initializers/mailers.rb.)
  def reject!
    with_lock do # transação + relê e bloqueia este pedido
      ensure_pending!
      rejected! # gerado pelo enum: update!(status: "rejected")
      AppointmentRequestMailer.rejected(self).deliver_later
    end
  end

  # Regra 3: aceitar rejeita os pendentes sobrepostos da mesma nutricionista.
  def accept!
    service.nutritionist.with_lock do
      lock! # relê o pedido e bloqueia-o: ninguém o muda até acabar
      ensure_pending!

      accepted!
      AppointmentRequestMailer.accepted(self).deliver_later

      # FOR UPDATE: bloqueia já estas linhas. Se outra sessão estiver a decidir
      # um deles, esperamos e o Postgres reavalia "status = pending", por isso um
      # pedido entretanto rejeitado deixa de vir na lista (em vez de rebentar).
      # "OF appointment_requests": só bloqueia esta tabela, não os services do JOIN.
      AppointmentRequest.pending
                        .for_nutritionist(service.nutritionist_id)
                        .overlapping(starts_at, ends_at)
                        .lock("FOR UPDATE OF appointment_requests")
                        .each(&:reject!)
    end
  end

  def self.lock_guest_email!(email)
    connection.execute(sanitize_sql_array([ "SELECT pg_advisory_xact_lock(hashtext(?))", email.to_s ]))
  end
  private_class_method :lock_guest_email!

  private

  # Só pedidos pendentes podem ser aceites ou rejeitados.
  def ensure_pending!
    raise InvalidTransition, "request is #{status}, not pending" unless pending?
  end

  def starts_at_in_future
    errors.add(:starts_at, "must be in the future") if starts_at && starts_at <= Time.current
  end

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
