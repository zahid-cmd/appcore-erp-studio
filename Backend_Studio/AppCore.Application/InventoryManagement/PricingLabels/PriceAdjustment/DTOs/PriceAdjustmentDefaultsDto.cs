//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : what the page needs for a product type
//===============================================================

public class PriceAdjustmentDefaultsDto
{
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // PA-<type>-0001 the next save will take (preview)
    public string NextNo { get; set; } = string.Empty;

    // Every product of the type, with or without stock
    public List<PriceAdjustmentProductOptionDto> Products { get; set; } = new();

    // Brands of those products (Id < 0 : a category whose name
    // stands for the brand)
    public List<PriceAdjustmentBrandOptionDto> Brands { get; set; } = new();

    // Suppliers with their default settlement
    public List<PriceAdjustmentSupplierOptionDto> Suppliers { get; set; } = new();
}

public class PriceAdjustmentProductOptionDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The maker's part number (Motor Bikes : none)
    public string PartNumber { get; set; } = string.Empty;

    // Brand (from the product category; 0 / '' = none)
    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public long CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    // Current MRP : the price index, else the latest priced batch
    // (0 = never priced)
    public decimal LastMrp { get; set; }

    // On hand now, all branches
    public decimal Stock { get; set; }
}

public class PriceAdjustmentBrandOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;
}

public class PriceAdjustmentSupplierOptionDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // Supplier / Reserve / Income
    public string IncreaseTo { get; set; } = string.Empty;

    // Supplier / Expense
    public string ReductionTo { get; set; } = string.Empty;
}
