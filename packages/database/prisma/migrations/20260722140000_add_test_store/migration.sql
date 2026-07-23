-- Adiciona a Test Store do RevenueCat como origem de assinatura, para testar o
-- fluxo completo em desenvolvimento sem configurar Google Play / App Store.
-- IF NOT EXISTS torna a migration reexecutável com segurança (PG 12+).
ALTER TYPE "SubscriptionStore" ADD VALUE IF NOT EXISTS 'TEST_STORE';
