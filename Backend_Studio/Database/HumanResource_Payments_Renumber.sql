-- =====================================================================
-- HumanResource_Payments_Renumber.sql   (2026-11-14)
-- ---------------------------------------------------------------------
-- Gives the payments numbered the first way (PPY-0001) a number in the
-- voucher format :
--
--     PPY-010101-2627-11-00001     Payroll Payments
--     PFP-010101-2627-11-00001     PF Payments
--
-- branch, financial year and month are taken from the payment's own
-- Payment Voucher (PV-010101-2627-11-00001); the serial goes on from
-- the highest one of that month.
--
-- The new number is also written where the old one shows :
--     PaymentVoucher        "ReferenceNo", "Narration"
--     PaymentVoucherLines   "ShortNotes"
-- (the lines already posted to the ledgers keep their text.)
--
-- Safe to run more than once : a payment that has the new format is
-- left alone. ASCII only.
-- =====================================================================

BEGIN;

ALTER TABLE public."HrPayments"
    ALTER COLUMN "Code" TYPE character varying(30);

DO $$
DECLARE
    r        record;
    v_start  text;
    v_serial int;
    v_new    text;
    v_count  int := 0;
BEGIN
    FOR r IN
        SELECT "PaymentId", "Code", "PaymentType", "PaymentVoucherId", "PaymentVoucherNo"
        FROM   public."HrPayments"
        WHERE  "Code" ~ '^PPY-[0-9]{1,6}$'
        ORDER  BY "PaymentId"
    LOOP
        -- PV-010101-2627-11-00001 : its branch, year and month
        IF r."PaymentVoucherNo" !~ '^[A-Z]+-[0-9]+-[0-9]+-[0-9]{2}-[0-9]+$' THEN
            RAISE NOTICE 'Skipped % : its Payment Voucher number (%) is not in the voucher format.', r."Code", r."PaymentVoucherNo";
            CONTINUE;
        END IF;

        v_start :=
            CASE WHEN r."PaymentType" IN ('PfSettlement', 'PfLoan') THEN 'PFP' ELSE 'PPY' END
            || '-' || split_part(r."PaymentVoucherNo", '-', 2)
            || '-' || split_part(r."PaymentVoucherNo", '-', 3)
            || '-' || split_part(r."PaymentVoucherNo", '-', 4)
            || '-';

        SELECT COALESCE(MAX(substr("Code", length(v_start) + 1)::int), 0) + 1 INTO v_serial
        FROM   public."HrPayments"
        WHERE  "Code" LIKE v_start || '%'
        AND    substr("Code", length(v_start) + 1) ~ '^[0-9]+$';

        v_new := v_start || lpad(v_serial::text, 5, '0');

        UPDATE public."HrPayments"
        SET    "Code" = v_new
        WHERE  "PaymentId" = r."PaymentId";

        IF r."PaymentVoucherId" IS NOT NULL THEN
            UPDATE public."PaymentVoucher"
            SET    "ReferenceNo" = replace("ReferenceNo", r."Code", v_new),
                   "Narration"   = left(replace("Narration", r."Code", v_new), 500)
            WHERE  "PaymentVoucherId" = r."PaymentVoucherId";

            UPDATE public."PaymentVoucherLines"
            SET    "ShortNotes" = replace("ShortNotes", r."Code", v_new)
            WHERE  "PaymentVoucherId" = r."PaymentVoucherId";
        END IF;

        v_count := v_count + 1;

        RAISE NOTICE '% is now %', r."Code", v_new;
    END LOOP;

    RAISE NOTICE '% payment(s) renumbered.', v_count;
END $$;

COMMIT;


-- ------------------------------------------------------------
-- Check (run on its own)
-- ------------------------------------------------------------
SELECT p."Code", p."PaymentType", p."SourceCode", p."PaymentVoucherNo", v."ReferenceNo"
FROM   public."HrPayments" p
LEFT   JOIN public."PaymentVoucher" v ON v."PaymentVoucherId" = p."PaymentVoucherId"
ORDER  BY p."PaymentId";
