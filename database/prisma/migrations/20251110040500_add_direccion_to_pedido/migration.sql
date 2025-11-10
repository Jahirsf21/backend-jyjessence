-- Add direccionId to Pedido and foreign key to Direccion

ALTER TABLE "Pedido"
  ADD COLUMN IF NOT EXISTS "direccionId" TEXT;

CREATE INDEX IF NOT EXISTS "Pedido_direccionId_idx" ON "Pedido"("direccionId");

ALTER TABLE "Pedido"
  ADD CONSTRAINT "Pedido_direccionId_fkey"
  FOREIGN KEY ("direccionId") REFERENCES "Direccion"("idDireccion")
  ON DELETE SET NULL ON UPDATE CASCADE;
