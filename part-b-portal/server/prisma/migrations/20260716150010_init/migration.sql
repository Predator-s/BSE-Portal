-- CreateEnum
CREATE TYPE "Scope" AS ENUM ('ALL', 'OWN', 'MAPPED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleFeature" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "scope" "Scope" NOT NULL DEFAULT 'ALL',

    CONSTRAINT "RoleFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "employeeId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "kycStatus" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "rmId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "tradeValue" DOUBLE PRECISION NOT NULL,
    "brokerage" DOUBLE PRECISION NOT NULL,
    "exchange" TEXT NOT NULL,
    "tradedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "windowFrom" TIMESTAMP(3),
    "watermark" TIMESTAMP(3),
    "total" INTEGER,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Role_orgId_key_key" ON "Role"("orgId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "RoleFeature_roleId_featureId_key" ON "RoleFeature"("roleId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Client_rmId_idx" ON "Client"("rmId");

-- CreateIndex
CREATE INDEX "Trade_clientId_idx" ON "Trade"("clientId");

-- CreateIndex
CREATE INDEX "Trade_tradedAt_idx" ON "Trade"("tradedAt");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleFeature" ADD CONSTRAINT "RoleFeature_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleFeature" ADD CONSTRAINT "RoleFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_rmId_fkey" FOREIGN KEY ("rmId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
