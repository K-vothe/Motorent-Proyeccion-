-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('THEFT', 'ACCIDENT', 'DISAPPEARANCE');

-- CreateEnum
CREATE TYPE "LegalDocType" AS ENUM ('TRANSIT_LICENSE', 'SOAT', 'TECHNICAL_REVIEW', 'INSURANCE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'REFUNDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MotoStatus" ADD VALUE 'STOLEN';
ALTER TYPE "MotoStatus" ADD VALUE 'ACCIDENTED';
ALTER TYPE "MotoStatus" ADD VALUE 'MISSING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RentalStatus" ADD VALUE 'PAID';
ALTER TYPE "RentalStatus" ADD VALUE 'RETURNED';
ALTER TYPE "RentalStatus" ADD VALUE 'INCIDENT';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "documentBackEnc" BYTEA,
ADD COLUMN     "documentFrontEnc" BYTEA,
ADD COLUMN     "licenseBackEnc" BYTEA,
ADD COLUMN     "licenseFrontEnc" BYTEA,
ALTER COLUMN "documentFrontUrl" DROP NOT NULL,
ALTER COLUMN "documentBackUrl" DROP NOT NULL,
ALTER COLUMN "licenseFrontUrl" DROP NOT NULL,
ALTER COLUMN "licenseBackUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "documentHash" TEXT,
ADD COLUMN     "signatureEnc" BYTEA,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedIp" TEXT;

-- AlterTable
ALTER TABLE "Rental" ADD COLUMN     "incidentAt" TIMESTAMP(3),
ADD COLUMN     "incidentNotes" TEXT,
ADD COLUMN     "incidentType" "IncidentType";

-- CreateTable
CREATE TABLE "MotoLegalDocument" (
    "id" TEXT NOT NULL,
    "motoId" TEXT NOT NULL,
    "type" "LegalDocType" NOT NULL,
    "number" TEXT,
    "expiresAt" TIMESTAMP(3),
    "fileEnc" BYTEA NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotoLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotoImage" (
    "id" TEXT NOT NULL,
    "motoId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotoImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalClause" (
    "rentalId" TEXT NOT NULL,
    "clauseId" TEXT NOT NULL,
    "clauseVersion" INTEGER NOT NULL,
    "bodySnapshot" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentalClause_pkey" PRIMARY KEY ("rentalId","clauseId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotoLegalDocument_motoId_type_key" ON "MotoLegalDocument"("motoId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- AddForeignKey
ALTER TABLE "MotoLegalDocument" ADD CONSTRAINT "MotoLegalDocument_motoId_fkey" FOREIGN KEY ("motoId") REFERENCES "Moto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotoImage" ADD CONSTRAINT "MotoImage_motoId_fkey" FOREIGN KEY ("motoId") REFERENCES "Moto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalClause" ADD CONSTRAINT "RentalClause_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalClause" ADD CONSTRAINT "RentalClause_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "Clause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
