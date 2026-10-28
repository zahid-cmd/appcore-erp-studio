//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Order Defaults (Add / Edit form)
//
// Next number (preview only, nothing reserved), the period, today,
// the suppliers allowed on the page and its products.
//===============================================================

public class PurchaseOrdersMbDefaultsDto
{
    public string OrderNo { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public string FinancialYearName { get; set; } = string.Empty;

    public string FinancialYearCode { get; set; } = string.Empty;

    public int PeriodMonth { get; set; }

    // '' = fine ; otherwise why no number (no open year, …)
    public string Message { get; set; } = string.Empty;

    // yyyy-MM-dd (Asia/Dhaka)
    public string Today { get; set; } = string.Empty;

    public List<PurchaseOrderSupplierOptionDto> Suppliers { get; set; } = new();

    public List<PurchaseOrderProductOptionDto> Products { get; set; } = new();
}


public class PurchaseOrderSupplierOptionDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string DisplayName { get; set; } = string.Empty;

    public string SupplyType { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public string BinNo { get; set; } = string.Empty;

    public int CreditDays { get; set; }

    // Optional : a supplier with a brand supplies only that
    // brand's products (the Add list follows it)
    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class PurchaseOrderProductOptionDto
{
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Brand category / model (sub category) : the Add filters
    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public long SubCategoryId { get; set; }

    public string SubCategoryName { get; set; } = string.Empty;

    // Brand of the category (null : category saved without one)
    public long? BrandManagementId { get; set; }

    public bool IsActive { get; set; }
}