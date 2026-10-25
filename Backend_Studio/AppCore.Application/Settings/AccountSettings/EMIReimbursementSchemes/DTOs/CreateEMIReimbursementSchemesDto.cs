//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Create EMI Reimbursement Scheme (the code is set by the server)
//===============================================================

public class CreateEmiReimbursementSchemesDto
{
    // Brand Management → BrandCode
    public string BrandCode { get; set; } = string.Empty;

    // yyyy-MM-dd (required)
    public string ValidFrom { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = open ended)
    public string ValidTo { get; set; } = string.Empty;

    // 0 = all tenures
    public int TenureMonths { get; set; }

    // Percent / Fixed
    public string SwapBasis { get; set; } = string.Empty;

    public decimal SwapValue { get; set; }

    public decimal? SwapCap { get; set; }

    // Percent / Fixed
    public string EmiBasis { get; set; } = string.Empty;

    public decimal EmiValue { get; set; }

    public decimal? EmiCap { get; set; }

    public decimal? TotalCap { get; set; }

    public string Remarks { get; set; } = string.Empty;

    public bool Status { get; set; }
}