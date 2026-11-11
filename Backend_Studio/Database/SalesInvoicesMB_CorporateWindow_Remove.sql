ROLLBACK;

-- ============================================================
-- Sales Invoices - MB : Corporate sale without a date window
-- (owner 2026-11-11)
--
-- One switch only : CFG-MOD-008-0073 Allow Corporate Sale (ON =
-- the Corporate tab works on any invoice date). The child date
-- switches CFG-MOD-008-0074 Corporate Sale From and
-- CFG-MOD-008-0075 Corporate Sale Until are removed; the
-- backend no longer reads them.
--
-- Safe to run more than once. ASCII only.
-- ============================================================

BEGIN;

DELETE FROM "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0074', 'CFG-MOD-008-0075');

UPDATE "SystemConfigurations"
SET    "OnDescription" = 'The invoice offers the Corporate tab : several chassis on one invoice, for a Corporate / Institution customer (Customer Profiles). Each chassis gets its own customer file (invoice no /1, /2 ...).',
       "Remarks"       = 'Critical. No date window (owner 2026-11-11).'
WHERE  "ConfigurationCode" = 'CFG-MOD-008-0073';

COMMIT;

SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "OnDescription"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-008-0073', 'CFG-MOD-008-0074', 'CFG-MOD-008-0075');
