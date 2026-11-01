//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Platform.Accounting;


//===============================================================
// VAT Applicability (Spare Parts & Lubricants / Accessories)
//
// Four critical switches (VAT Management, MOD-013) :
//   CFG-MOD-013-0001  Purchase VAT Applicable : Spare Parts & Lubricants
//   CFG-MOD-013-0002  Sales VAT Applicable    : Spare Parts & Lubricants
//   CFG-MOD-013-0003  Purchase VAT Applicable : Accessories
//   CFG-MOD-013-0004  Sales VAT Applicable    : Accessories
// The switch Value = Effective From (yyyy-MM-dd). Every change is
// kept in VatApplicabilityHistory; a document follows the state
// in force on ITS OWN date (before the first change : applicable).
// Motor bikes are not covered (always VAT).
//===============================================================

public interface IVatApplicabilityService
{
    // productLine : SP / AC (anything else : always applicable)
    Task<VatApplicabilityDto> GetAsync(
        string productLine,
        DateOnly date);
}


public class VatApplicabilityDto
{
    // SP / AC / MB
    public string ProductLine { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string Date { get; set; } = string.Empty;

    // The supplier charges VAT
    public bool PurchaseVatApplicable { get; set; } = true;

    // We charge VAT when selling (purchase VAT is claimable only
    // when this is true)
    public bool SalesVatApplicable { get; set; } = true;

    // yyyy-MM-dd of the change in force ('' = never changed)
    public string PurchaseSince { get; set; } = string.Empty;

    public string SalesSince { get; set; } = string.Empty;
}