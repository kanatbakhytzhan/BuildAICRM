-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "shiftStart" TEXT;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "shiftEnd" TEXT;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "lastAssignedUserId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShiftAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftAttendance_tenantId_date_key" ON "ShiftAttendance"("tenantId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShiftAttendance_tenantId_idx" ON "ShiftAttendance"("tenantId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ShiftAttendance" ADD CONSTRAINT "ShiftAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
