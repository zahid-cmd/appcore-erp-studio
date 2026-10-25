//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes Defaults
//
// Next code (preview only), the brands with their Motor Bikes
// Supplier, and the fixed tenure / basis lists.
//===============================================================

public class EmiReimbursementSchemesDefaultsDto
{
    public string Code { get; set; } = string.Empty;

    public List<EmiSchemeBrandOptionDto> Brands { get; set; } = new();

    // 0 = All
    public List<int> Tenures { get; set; } = new();

    // Percent / Fixed
    public List<string> Bases { get; set; } = new();

    // Today (Asia/Dhaka), yyyy-MM-dd
    public string Today { get; set; } = string.Empty;
}


public class EmiSchemeBrandOptionDto
{
    public string BrandCode { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    // '' when the brand has no Motor Bikes Supplier
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;
}