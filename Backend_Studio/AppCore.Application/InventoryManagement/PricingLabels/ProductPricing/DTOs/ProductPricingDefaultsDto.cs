//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing : what the page needs for a product type
//===============================================================

public class ProductPricingDefaultsDto
{
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // PC-<type>-0001 the next save will take
    public string NextNumber { get; set; } = string.Empty;

    // Profit % On Sale Price (CFG-MOD-012-0010) : OFF = on cost
    // (markup), ON = margin on the net sale
    public bool ProfitOnSale { get; set; }

    // Pricing Grid MRP Editable (CFG-MOD-012-0011)
    public bool GridEditable { get; set; }

    // Raise Old Stock to a Higher New MRP (CFG-MOD-012-0012)
    public bool RaiseOldStock { get; set; }

    // Price Reduction Applies to All Stock (CFG-MOD-012-0013)
    public bool ReductionAllStock { get; set; }

    // Sales VAT inside the MRP : applicability and the rules
    public bool SalesVatApplicable { get; set; }

    public List<ProductPricingVatRuleDto> SalesVatRules { get; set; } = new();

    // Products of the type with stock
    public List<ProductPricingProductDto> Products { get; set; } = new();
}

public class ProductPricingVatRuleDto
{
    public string VatType { get; set; } = string.Empty;

    public decimal Rate { get; set; }

    public string EffectiveFrom { get; set; } = string.Empty;

    public string ValidTo { get; set; } = string.Empty;
}

public class ProductPricingProductDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // The maker's part number and name (what suppliers know; the
    // product code stays internal). Motor Bikes : no part number,
    // the model name
    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    // Its group / sub-group (category / sub-category)
    public long CategoryId { get; set; }

    public long SubCategoryId { get; set; }

    // Brand (from the product category; 0 / '' = none)
    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string VatType { get; set; } = string.Empty;

    // In stock (on hand + in transit), all branches
    public decimal InStock { get; set; }

    // Batches in stock / of them unpriced (MRP 0)
    public int BatchCount { get; set; }

    public int UnpricedCount { get; set; }

    // MRP of the latest priced batch (0 = never priced)
    public decimal LastMrp { get; set; }
}


//===============================================================
// Excel import : parts not in the database (Spare Parts /
// Lubricants), created with the Spare Parts page's rules
//===============================================================

public class NewItemCategoryDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Spare Parts / Lubricants
    public string CategoryType { get; set; } = string.Empty;
}

public class NewItemSubCategoryDto
{
    public long Id { get; set; }

    public long CategoryId { get; set; }

    public string Name { get; set; } = string.Empty;
}

public class NewItemRackDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Shelves with at least one free bin
    public List<int> FreeShelves { get; set; } = new();

    // Free bins (a bin holds one item), shelf then bin order
    public List<NewItemBinDto> FreeBins { get; set; } = new();
}

public class NewItemBinDto
{
    public int ShelfNumber { get; set; }

    public int BinNumber { get; set; }

    // A-01-02
    public string BinCode { get; set; } = string.Empty;
}

public class NewItemSetupDto
{
    public List<NewItemCategoryDto> Categories { get; set; } = new();

    public List<NewItemSubCategoryDto> SubCategories { get; set; } = new();

    public List<string> Units { get; set; } = new();

    // The current branch and its (default) warehouse : the rack /
    // shelf of a new part (optional)
    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public List<NewItemRackDto> Racks { get; set; } = new();
}

public class NewItemInputDto
{
    // The import row it came from
    public long Key { get; set; }

    public long ProductCategoryId { get; set; }

    public long ProductSubCategoryId { get; set; }

    public string PartNumber { get; set; } = string.Empty;

    public string PartName { get; set; } = string.Empty;

    public string Unit { get; set; } = "Pcs";

    // 0 = no rack / shelf
    public long RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    // 0 with a rack and shelf = bin 1
    public int BinNumber { get; set; }
}

public class NewItemResultDto
{
    public long Key { get; set; }

    public bool Created { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string Error { get; set; } = string.Empty;
}
