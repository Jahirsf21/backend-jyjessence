-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_clienteId_fkey";

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "guestAddress" TEXT,
ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "isGuestOrder" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "clienteId" DROP NOT NULL,
ALTER COLUMN "direccionId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("idCliente") ON DELETE SET NULL ON UPDATE CASCADE;
