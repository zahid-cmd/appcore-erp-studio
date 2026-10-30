//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Accounting;


//===============================================================
// Posting purposes (codes of the Posting Setup rows)
//===============================================================

public static class PostingPurposes
{
    public const string VatMotorBikes = "VAT-MB";

    public const string VatSpareParts = "VAT-SP";

    public const string VatServiceCharges = "VAT-SV";

    public const string VatAccessories = "VAT-AC";

    public const string InterBranch = "INTER-BRANCH";

    public const string OpeningStock = "OPENING-STOCK";

    // Charges the company bears (expense)
    public const string BankCharges = "BANK-CHARGES";

    public const string MfsCharges = "MFS-CHARGES";

    public const string PosCharges = "POS-CHARGES";

    public const string EmiCharges = "EMI-CHARGES";

    // Charges recovered from the customer / payer (income)
    public const string MfsRecovery = "MFS-RECOVERY";

    public const string PosRecovery = "POS-RECOVERY";

    public const string EmiRecovery = "EMI-RECOVERY";

    public const string DishonourRecovery = "DISHONOUR-RECOVERY";

    // Charges recovery reserves (use not decided yet)
    public const string MfsReserve = "MFS-RESERVE";

    public const string PosReserve = "POS-RESERVE";

    public const string EmiReserve = "EMI-RESERVE";


    //===========================================================
    // VAT purpose of a product / page type
    //   MB · SP (lubricants too) · AC · SV (service charges)
    //===========================================================

    public static string VatFor(
        string productType)
    {
        return (productType ?? string.Empty).Trim().ToUpperInvariant() switch
        {
            "MB" => VatMotorBikes,
            "SP" or "LB" => VatSpareParts,
            "AC" => VatAccessories,
            "SV" => VatServiceCharges,
            _ => throw new InvalidOperationException(
                $"No VAT ledger purpose for product type '{productType}'.")
        };
    }


    //===========================================================
    // VAT purpose of a VAT Setup type
    //   Motor Bikes · Spare Parts / Lubricants · Accessories ·
    //   Service Charges
    //===========================================================

    public static string VatForVatType(
        string vatType)
    {
        return (vatType ?? string.Empty).Trim().ToUpperInvariant() switch
        {
            "MOTOR BIKES" => VatMotorBikes,
            "SPARE PARTS" or "LUBRICANTS" => VatSpareParts,
            "ACCESSORIES" => VatAccessories,
            "SERVICE CHARGES" => VatServiceCharges,
            _ => throw new InvalidOperationException(
                $"No VAT ledger purpose for VAT type '{vatType}'.")
        };
    }
}


//===============================================================
// Posting Ledger Service
//
// Every posting reads its fixed ledgers (VAT, Inter-Branch,
// Opening Stock ...) from the Posting Setup page through here,
// never from a constant.
//===============================================================

public interface IPostingLedgerService
{
    //===========================================================
    // The ledger of one purpose, checked : set, found, active.
    // Throws InvalidOperationException with a message for the
    // user otherwise.
    //===========================================================

    Task<VoucherLedgerDto> GetLedgerAsync(
        string purposeCode);
}
