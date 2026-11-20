/*
  Warnings:

  - The values [STOLEN,ACCIDENTED,MISSING] on the enum `MotoStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [PAID,RETURNED,INCIDENT] on the enum `RentalStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [CLIENT] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `documentHash` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `signatureEnc` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `signedIp` on the `Contract` table. All the data in the column will be lost.
  - You are about to drop the column `accountHolderDoc` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `accountHolderName` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `accountType` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `verificationNotes` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `verificationStatus` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `Owner` table. All the data in the column will be lost.
  - You are about to drop the column `clientId` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the column `incidentAt` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the column `incidentNotes` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the column `incidentType` on the `Rental` table. All the data in the column will be lost.
  - You are about to drop the `Clause` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MotoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MotoLegalDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RentalClause` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[idUser]` on the table `Owner` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cedulaNumero]` on the table `Owner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `billUrl` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cedulaBackUrl` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cedulaFrontUrl` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cedulaNumero` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idUser` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `photo` to the `Owner` table without a default value. This is not possible if the table is not empty.
  - Added the required column `renterId` to the `Rental` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RenterVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OwnerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "MotoStatus_new" AS ENUM ('PENDING_APPROVAL', 'AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'INACTIVE', 'REJECTED');
ALTER TABLE "public"."Moto" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Moto" ALTER COLUMN "status" TYPE "MotoStatus_new" USING ("status"::text::"MotoStatus_new");
ALTER TYPE "MotoStatus" RENAME TO "MotoStatus_old";
ALTER TYPE "MotoStatus_new" RENAME TO "MotoStatus";
DROP TYPE "public"."MotoStatus_old";
ALTER TABLE "Moto" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "RentalStatus_new" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Rental" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Rental" ALTER COLUMN "status" TYPE "RentalStatus_new" USING ("status"::text::"RentalStatus_new");
ALTER TYPE "RentalStatus" RENAME TO "RentalStatus_old";
ALTER TYPE "RentalStatus_new" RENAME TO "RentalStatus";
DROP TYPE "public"."RentalStatus_old";
ALTER TABLE "Rental" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'RENTER', 'OWNER', 'ADMIN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_userId_fkey";

-- DropForeignKey
ALTER TABLE "MotoImage" DROP CONSTRAINT "MotoImage_motoId_fkey";

-- DropForeignKey
ALTER TABLE "MotoLegalDocument" DROP CONSTRAINT "MotoLegalDocument_motoId_fkey";

-- DropForeignKey
ALTER TABLE "Owner" DROP CONSTRAINT "Owner_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_rentalId_fkey";

-- DropForeignKey
ALTER TABLE "Rental" DROP CONSTRAINT "Rental_clientId_fkey";

-- DropForeignKey
ALTER TABLE "RentalClause" DROP CONSTRAINT "RentalClause_clauseId_fkey";

-- DropForeignKey
ALTER TABLE "RentalClause" DROP CONSTRAINT "RentalClause_rentalId_fkey";

-- DropIndex
DROP INDEX "Owner_userId_key";

-- AlterTable
ALTER TABLE "Contract" DROP COLUMN "documentHash",
DROP COLUMN "signatureEnc",
DROP COLUMN "signedAt",
DROP COLUMN "signedIp";

-- AlterTable
ALTER TABLE "Owner" DROP COLUMN "accountHolderDoc",
DROP COLUMN "accountHolderName",
DROP COLUMN "accountNumber",
DROP COLUMN "accountType",
DROP COLUMN "bankName",
DROP COLUMN "userId",
DROP COLUMN "verificationNotes",
DROP COLUMN "verificationStatus",
DROP COLUMN "verifiedAt",
ADD COLUMN     "billUrl" TEXT NOT NULL,
ADD COLUMN     "cedulaBackUrl" TEXT NOT NULL,
ADD COLUMN     "cedulaFrontUrl" TEXT NOT NULL,
ADD COLUMN     "cedulaNumero" TEXT NOT NULL,
ADD COLUMN     "estadoVerificacion" "OwnerVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "fechaVerificacion" TIMESTAMP(3),
ADD COLUMN     "idUser" TEXT NOT NULL,
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "photo" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Rental" DROP COLUMN "clientId",
DROP COLUMN "incidentAt",
DROP COLUMN "incidentNotes",
DROP COLUMN "incidentType",
ADD COLUMN     "renterId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Clause";

-- DropTable
DROP TABLE "Client";

-- DropTable
DROP TABLE "MotoImage";

-- DropTable
DROP TABLE "MotoLegalDocument";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "RentalClause";

-- DropEnum
DROP TYPE "IncidentType";

-- DropEnum
DROP TYPE "LegalDocType";

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "Renter" (
    "id" TEXT NOT NULL,
    "idUser" TEXT NOT NULL,
    "cedulaNumero" TEXT NOT NULL,
    "cedulaFrontUrl" TEXT NOT NULL,
    "cedulaBackUrl" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseFrontUrl" TEXT NOT NULL,
    "licenseBackUrl" TEXT NOT NULL,
    "licenseCategory" TEXT NOT NULL,
    "billUrl" TEXT NOT NULL,
    "estadoVerificacion" "RenterVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "motivoRechazo" TEXT,
    "fechaVerificacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Renter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Renter_idUser_key" ON "Renter"("idUser");

-- CreateIndex
CREATE UNIQUE INDEX "Renter_cedulaNumero_key" ON "Renter"("cedulaNumero");

-- CreateIndex
CREATE UNIQUE INDEX "Renter_licenseNumber_key" ON "Renter"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_idUser_key" ON "Owner"("idUser");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_cedulaNumero_key" ON "Owner"("cedulaNumero");

-- AddForeignKey
ALTER TABLE "Renter" ADD CONSTRAINT "Renter_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_idUser_fkey" FOREIGN KEY ("idUser") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rental" ADD CONSTRAINT "Rental_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "Renter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
