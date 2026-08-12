-- Plano bimestral (R$ 4,90 a cada 2 meses), agora o unico ofertado no app.
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BIMONTHLY';
