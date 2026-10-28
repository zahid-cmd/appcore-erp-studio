//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.VatManagement.VatSetup;


//===============================================================
// Update Sales VAT rule (code and VAT Type are locked)
//===============================================================

public class UpdateSalesVatDto
    : CreateSalesVatDto
{
    public long SalesVatId { get; set; }
}


//===============================================================
// Extend a rule : same rate, later Valid To
//===============================================================

public class ExtendSalesVatDto
{
    public long SalesVatId { get; set; }

    // yyyy-MM-dd : the new Valid To (after the current one)
    public string ValidTo { get; set; } = string.Empty;
}