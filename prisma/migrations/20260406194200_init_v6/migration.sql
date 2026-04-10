-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'CLIENTE', 'MESERO', 'COCINA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('WAITLIST', 'CONFIRMADA', 'SENTADO', 'CANCELADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "ZonaMesa" AS ENUM ('TERRAZA', 'SALON', 'VIP');

-- CreateEnum
CREATE TYPE "EstadoMesa" AS ENUM ('LIBRE', 'OCUPADA', 'SUCIA', 'RESERVADA');

-- CreateEnum
CREATE TYPE "CategoriaMenu" AS ENUM ('ENTRADAS', 'PLATOS_FUERTES', 'BEBIDAS', 'POSTRES');

-- CreateEnum
CREATE TYPE "EstadoOrden" AS ENUM ('ABIERTA', 'EN_PREPARACION', 'LISTO', 'SERVIDO', 'PAGADO');

-- CreateEnum
CREATE TYPE "EstadoItem" AS ENUM ('PENDIENTE', 'COCINANDO', 'LISTO');

-- CreateTable
CREATE TABLE "Restaurante" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "direccion" TEXT,
    "configuracion" JSONB,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Restaurante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'CLIENTE',
    "restauranteId" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservacion" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "fechaPrincipal" TIMESTAMP(3) NOT NULL,
    "horaPrincipal" TEXT NOT NULL,
    "fechaPlanB" TIMESTAMP(3) NOT NULL,
    "horaPlanB" TEXT NOT NULL,
    "numPersonas" INTEGER NOT NULL DEFAULT 2,
    "ocasion" TEXT,
    "notasEspeciales" TEXT,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'WAITLIST',
    "isWaitlistActive" BOOLEAN NOT NULL DEFAULT false,
    "posicionEspera" INTEGER,
    "usuarioId" TEXT NOT NULL,
    "restauranteId" TEXT NOT NULL,
    "mesaId" TEXT,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "numeroMesa" INTEGER NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "zona" "ZonaMesa" NOT NULL DEFAULT 'SALON',
    "estado" "EstadoMesa" NOT NULL DEFAULT 'LIBRE',
    "restauranteId" TEXT NOT NULL,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "categoria" "CategoriaMenu" NOT NULL,
    "estaDisponible" BOOLEAN NOT NULL DEFAULT true,
    "imagenUrl" TEXT,
    "restauranteId" TEXT NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orden" (
    "id" TEXT NOT NULL,
    "estado" "EstadoOrden" NOT NULL DEFAULT 'ABIERTA',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "mesaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "reservacionId" TEXT,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleOrden" (
    "id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioHistorico" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "notasCocina" TEXT,
    "estadoItem" "EstadoItem" NOT NULL DEFAULT 'PENDIENTE',
    "ordenId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,

    CONSTRAINT "DetalleOrden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "stockActual" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT NOT NULL,
    "stockMinimoAlerta" DOUBLE PRECISION NOT NULL,
    "restauranteId" TEXT NOT NULL,

    CONSTRAINT "Ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receta" (
    "menuItemId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "cantidadUsada" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Receta_pkey" PRIMARY KEY ("menuItemId","ingredienteId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Restaurante_slug_key" ON "Restaurante"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Reservacion_folio_key" ON "Reservacion"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_restauranteId_numeroMesa_key" ON "Mesa"("restauranteId", "numeroMesa");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservacion" ADD CONSTRAINT "Reservacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservacion" ADD CONSTRAINT "Reservacion_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservacion" ADD CONSTRAINT "Reservacion_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_reservacionId_fkey" FOREIGN KEY ("reservacionId") REFERENCES "Reservacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrden" ADD CONSTRAINT "DetalleOrden_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleOrden" ADD CONSTRAINT "DetalleOrden_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingrediente" ADD CONSTRAINT "Ingrediente_restauranteId_fkey" FOREIGN KEY ("restauranteId") REFERENCES "Restaurante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_ingredienteId_fkey" FOREIGN KEY ("ingredienteId") REFERENCES "Ingrediente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
