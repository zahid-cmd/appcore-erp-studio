//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Update Purchase VAT rule (code and VAT Type are locked)
//===============================================================

public class UpdatePurchaseVatDto
    : CreatePurchaseVatDto
{
    public long PurchaseVatId { get; set; }
}


//===============================================================
// Extend a rule : same rate, later Valid To
//===============================================================

public class ExtendPurchaseVatDto
{
    public long PurchaseVatId { get; set; }

    // yyyy-MM-dd : the new Valid To (after the current one)
    public string ValidTo { get; set; } = string.Empty;
}