ROLLBACK;

-- ==============================================================
-- Departments : the wing a department belongs to
-- --------------------------------------------------------------
-- Human Resource Management > Human Resource Setup > Department
-- gets a Wing dropdown. The technicians of Service Operations >
-- Service Setup > Workshop Configuration are the employees of the
-- departments under the Service Center wing.
--
-- Empty (NULL) on the existing departments : choose the wing on
-- the Department page. Safe to run again.
-- ==============================================================

ALTER TABLE "Departments"
    ADD COLUMN IF NOT EXISTS "WingId" bigint NULL;

CREATE INDEX IF NOT EXISTS "IX_Departments_WingId"
    ON "Departments" ("WingId");

-- Check : the departments and their wing
SELECT d."DepartmentCode", d."DepartmentName", w."WingCode", w."WingName"
FROM "Departments" d
LEFT JOIN "Wings" w ON w."WingId" = d."WingId"
WHERE d."IsDeleted" = false
ORDER BY d."DepartmentCode";
