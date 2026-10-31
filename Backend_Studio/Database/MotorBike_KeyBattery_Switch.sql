/*===============================================================
  Motor Bike Purchase : "Units Required" becomes
  "Key & Battery Required"  (CFG-MOD-007-0048)

  - Chassis No and Engine No : always required by the system
    (the bike's identity), no switch.
  - CFG-MOD-007-0048 Key & Battery Required
      ON  : every bike's Key No and Battery No are asked and
            required (Purchase Unit Desk when Products Received
            on Purchase is ON; Motor Bike Receiving otherwise).
      OFF : the dealer does not keep them : the Key / Battery
            columns are hidden and nothing is saved.
  - CFG-MOD-007-0049 Unique Key No and 0050 Unique Battery No
    now hang under 0048 (greyed "Needs … ON" while it is OFF).

  Safe to run more than once. Nothing else changes; the switch
  keeps its ON / OFF state.
===============================================================*/

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "SystemConfigurations" WHERE "ConfigurationCode" = 'CFG-MOD-007-0048') THEN
        RAISE EXCEPTION 'CFG-MOD-007-0048 not found : run the Purchases switches script first. Nothing changed.';
    END IF;

    UPDATE "SystemConfigurations"
    SET    "ConfigurationName" = 'Key & Battery Required',
           "OnDescription"     = 'Every bike''s Key No and Battery No are entered and required before it comes into stock (Purchase Unit Desk when Products Received on Purchase is ON, otherwise Motor Bike Receiving).',
           "OffDescription"    = 'Key No and Battery No are not kept : their columns are hidden on the Unit Desk.',
           "Remarks"           = 'Chassis No and Engine No are always required and unique (system rule, no switch).'
    WHERE  "ConfigurationCode" = 'CFG-MOD-007-0048';

    UPDATE "SystemConfigurations"
    SET    "ParentConfigurationCode" = 'CFG-MOD-007-0048',
           "OnDescription"     = 'The same Key No cannot be on two bikes in stock (needs Key & Battery Required ON).'
    WHERE  "ConfigurationCode" = 'CFG-MOD-007-0049';

    UPDATE "SystemConfigurations"
    SET    "ParentConfigurationCode" = 'CFG-MOD-007-0048',
           "OnDescription"     = 'The same Battery No cannot be on two bikes in stock (needs Key & Battery Required ON).'
    WHERE  "ConfigurationCode" = 'CFG-MOD-007-0050';

    RAISE NOTICE 'Key & Battery Required : 0048 renamed, 0049 / 0050 under it.';
END $$;

-- Check
SELECT "ConfigurationCode", "ConfigurationName", "IsEnabled", "ParentConfigurationCode"
FROM   "SystemConfigurations"
WHERE  "ConfigurationCode" IN ('CFG-MOD-007-0048', 'CFG-MOD-007-0049', 'CFG-MOD-007-0050')
ORDER  BY "ConfigurationCode";
