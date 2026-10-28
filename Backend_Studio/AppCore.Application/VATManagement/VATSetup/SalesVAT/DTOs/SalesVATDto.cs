//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Sales VAT rule (list / form)
//===============================================================

public class SalesVatDto
{
    public long SalesVatId { get; set; }

    // SVT-0001
    public string VatCode { get; set; } = string.Empty;

    public string VatType { get; set; } = string.Empty;

    public decimal VatRate { get; set; }

    public bool PriceIncludesVat { get; set; }

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string ValidTo { get; set; } = string.Empty;

    // Current / Expiring / Expired / Upcoming / Old / Inactive
    //   Expiring : current, Valid To within the reminder days and no
    //              next rule starting the day after
    //   Expired  : Valid To passed and no later active rule
    //   Old      : Valid To passed, a later rule took over
    public string RateState { get; set; } = string.Empty;

    // Days left to Valid To (negative once passed)
    public int DaysToExpiry { get; set; }

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }

    public DateTime CreatedDate { get; set; }

    public DateTime? ModifiedDate { get; set; }
}