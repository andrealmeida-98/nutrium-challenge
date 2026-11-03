# Emails só saem depois do commit da transação mais externa.
# Se houver rollback (ex.: accept! falha a meio), o job é descartado e nenhum email é enviado.
ActionMailer::MailDeliveryJob.enqueue_after_transaction_commit = true
