-- For SQLite, we need to recreate the table with the new enum values
-- Create a backup of the PackageDetail table
CREATE TABLE "PackageDetail_backup" AS SELECT * FROM "PackageDetail";

-- Drop the original table
DROP TABLE "PackageDetail";

-- Recreate the table with the updated Service enum values
CREATE TABLE "PackageDetail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weightGrams" INTEGER,
    "totalValue" DECIMAL,
    "packageDescription" TEXT,
    "lengthCm" DECIMAL,
    "widthCm" DECIMAL,
    "heightCm" DECIMAL,
    "volumetricGrams" INTEGER,
    "service" TEXT NOT NULL,
    "currency" TEXT,
    "sku" TEXT,
    "hsCode" TEXT,
    "countryOfOrigin" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Restore data from backup, mapping old service values to new ones
INSERT INTO "PackageDetail" 
SELECT 
    "id", 
    "weightGrams", 
    "totalValue", 
    "packageDescription", 
    "lengthCm", 
    "widthCm", 
    "heightCm", 
    "volumetricGrams", 
    CASE 
        WHEN "service" = 'economy' THEN 'economy_standard'
        WHEN "service" = 'express' THEN 'express'
        ELSE "service"
    END as "service",
    "currency", 
    "sku", 
    "hsCode", 
    "countryOfOrigin", 
    "createdAt", 
    "updatedAt"
FROM "PackageDetail_backup";

-- Drop the backup table
DROP TABLE "PackageDetail_backup";