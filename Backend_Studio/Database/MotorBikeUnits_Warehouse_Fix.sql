ROLLBACK;

-- ============================================================
-- MotorBikeUnits_Warehouse_Fix.sql (2026-11-09)
-- Bikes received on the purchase itself (switch 0045 "Products
-- Received on Purchase") were marked In Stock without a
-- warehouse, so the Sales Invoices - MB chassis list missed
-- them. Gives each such bike its purchase's warehouse.
-- Safe to run more than once.
-- ============================================================

UPDATE public."MotorBikeUnits" u
SET    "WarehouseId"  = p."WarehouseId",
       "ModifiedDate" = now()
FROM   public."PurchasesMb" p
WHERE  u."PurchaseId"  = p."PurchaseId"
AND    u."WarehouseId" IS NULL
AND    u."Status"      = 'InStock'
AND    u."IsDeleted"   = false
AND    p."WarehouseId" IS NOT NULL;


/*  Check (select and run on its own) : bikes in stock per
    branch / warehouse; a blank warehouse should be gone

SELECT u."BranchId", u."WarehouseId", w."WarehouseName",
       count(*) AS "Bikes"
FROM   public."MotorBikeUnits" u
LEFT JOIN public."Warehouses" w ON w."WarehouseId" = u."WarehouseId"
WHERE  u."Status" = 'InStock' AND u."IsDeleted" = false
GROUP  BY u."BranchId", u."WarehouseId", w."WarehouseName"
ORDER  BY 1, 2;
*/
