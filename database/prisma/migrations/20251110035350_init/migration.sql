-- CreateEnum
CREATE TYPE "CategoriaPerfume" AS ENUM ('ExtraitDeParfum', 'Parfum', 'EauDeParfum', 'EauDeToilette', 'EauFraiche', 'Elixir');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('Male', 'Female', 'Unisex');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "Cliente" (
    "idCliente" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "telefono" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("idCliente")
);

-- CreateTable
CREATE TABLE "Direccion" (
    "idDireccion" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "canton" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "barrio" TEXT,
    "senas" TEXT NOT NULL,
    "codigoPostal" TEXT,
    "referencia" TEXT,

    CONSTRAINT "Direccion_pkey" PRIMARY KEY ("idDireccion")
);

-- CreateTable
CREATE TABLE "Producto" (
    "idProducto" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" "CategoriaPerfume" NOT NULL,
    "genero" "Genero" NOT NULL,
    "mililitros" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "imagenesUrl" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("idProducto")
);

-- CreateTable
CREATE TABLE "CarritoItem" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "fechaAgregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarritoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "idPedido" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "montoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("idPedido")
);

-- CreateTable
CREATE TABLE "ArticuloDePedido" (
    "pedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ArticuloDePedido_pkey" PRIMARY KEY ("pedidoId","productoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cedula_key" ON "Cliente"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Direccion_clienteId_idx" ON "Direccion"("clienteId");

-- CreateIndex
CREATE INDEX "CarritoItem_clienteId_idx" ON "CarritoItem"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "CarritoItem_clienteId_productoId_key" ON "CarritoItem"("clienteId", "productoId");

-- AddForeignKey
ALTER TABLE "Direccion" ADD CONSTRAINT "Direccion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("idCliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoItem" ADD CONSTRAINT "CarritoItem_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("idCliente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarritoItem" ADD CONSTRAINT "CarritoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("idProducto") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("idCliente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloDePedido" ADD CONSTRAINT "ArticuloDePedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("idPedido") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticuloDePedido" ADD CONSTRAINT "ArticuloDePedido_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("idProducto") ON DELETE RESTRICT ON UPDATE CASCADE;
