//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Create Purchase VAT rule (the code is set by the server)
//===============================================================

public class CreatePurchaseVatDto
{
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string VatType { get; set; } = string.Empty;

    // 0 – 100, at most 2 decimals
    public decimal VatRate { get; set; }

    public bool InputCreditAllowed { get; set; } = true;

    // yyyy-MM-dd (required)
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd (required; not before Effective From)
    public string ValidTo { get; set; } = string.Empty;

    // VAT Current Account (General Ledger code)
    public string LedgerCode { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}