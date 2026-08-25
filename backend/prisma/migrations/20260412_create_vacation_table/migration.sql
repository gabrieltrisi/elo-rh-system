CREATE TABLE IF NOT EXISTS "Vacation" (
  "id" SERIAL NOT NULL,
  "employeeId" INTEGER NOT NULL,
  "acquisitionPeriod" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "days" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDENTE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Vacation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Vacation_employeeId_idx" ON "Vacation"("employeeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Vacation_employeeId_fkey'
  ) THEN
    ALTER TABLE "Vacation"
    ADD CONSTRAINT "Vacation_employeeId_fkey"
    FOREIGN KEY ("employeeId")
    REFERENCES "Employee"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;