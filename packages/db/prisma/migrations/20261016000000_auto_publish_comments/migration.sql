-- Los comentarios se publican automáticamente (el CMS ya no modera, solo elimina).
-- 1) Nuevos comentarios nacen aprobados.
ALTER TABLE "Comment" ALTER COLUMN "approved" SET DEFAULT true;
-- 2) Backfill: comentarios pendientes existentes pasan a publicados.
UPDATE "Comment" SET "approved" = true WHERE "approved" = false;
