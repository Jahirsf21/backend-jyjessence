-- Make direccionId NOT NULL in Pedido (assumes existing rows already have direccionId set)
UPDATE "Pedido" SET "direccionId" = (
  SELECT d."idDireccion" FROM "Direccion" d WHERE d."clienteId" = "Pedido"."clienteId" LIMIT 1
)
WHERE "direccionId" IS NULL;

ALTER TABLE "Pedido" ALTER COLUMN "direccionId" SET NOT NULL;
