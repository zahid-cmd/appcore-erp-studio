//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : what the page needs for one product type
//===============================================================

public class OpeningStockDefaultsDto
{
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (Bangladesh time)
    public string Today { get; set; } = string.Empty;

    // Branches with an active warehouse, each with the next
    // Opening Voucher No of this type
    public List<OpeningStockBranchDto> Branches { get; set; } = new();

    public List<OpeningStockWarehouseDto> Warehouses { get; set; } = new();

    public List<OpeningStockRackDto> Racks { get; set; } = new();

    public List<OpeningStockProductDto> Products { get; set; } = new();

    // GL ledgers for the credit side
    public List<OpeningStockLedgerDto> Ledgers { get; set; } = new();

    // Lock Opening Stock Ledger (CFG-MOD-012-0006) : ON = the
    // credit ledger is the Posting Setup one, not changeable
    public bool LedgerLocked { get; set; } = true;

    // Includes Unclaimed VAT (CFG-MOD-012-0007 MB / 0008 SP / 0009
    // AC) : the cost is typed incl. VAT and the VAT part goes to the
    // VAT Current Account
    public bool VatIncluded { get; set; }

    // Profit % On Sale Price (CFG-MOD-012-0010) : OFF = profit on
    // cost (markup), ON = margin on the net sale
    public bool ProfitOnSale { get; set; }

    // Posting Setup › Opening Stock ('' = not set)
    public string DefaultLedgerCode { get; set; } = string.Empty;

    // MB : Key & Battery Required (CFG-MOD-007-0048); OFF = not kept
    public bool UnitsRequired { get; set; }

    public bool UniqueKeyNo { get; set; }

    public bool UniqueBatteryNo { get; set; }

    // VAT (cost is typed excl. VAT; sale price / MRP incl. VAT)
    public bool PurchaseVatApplicable { get; set; } = true;

    public bool SalesVatApplicable { get; set; } = true;

    // Active rules of the type's VAT types (the page picks the one
    // of the opening date)
    public List<OpeningStockVatRuleDto> PurchaseVatRules { get; set; } = new();

    public List<OpeningStockVatRuleDto> SalesVatRules { get; set; } = new();
}

public class OpeningStockBranchDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    // OS-<code>-<type>-0001
    public string NextNumber { get; set; } = string.Empty;
}

public class OpeningStockVatRuleDto
{
    // Motor Bikes / Spare Parts / Lubricants / Accessories
    public string VatType { get; set; } = string.Empty;

    public decimal Rate { get; set; }

    // Purchase : input credit allowed (VAT out of the MRP cost)
    public bool InputCreditAllowed { get; set; } = true;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    public string ValidTo { get; set; } = string.Empty;
}


public class OpeningStockWarehouseDto
{
    public long Id { get; set; }

    public long BranchId { get; set; }

    public string BranchName { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public bool IsDefault { get; set; }
}


public class OpeningStockRackDto
{
    public long Id { get; set; }

    public long WarehouseId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int ShelfCount { get; set; }

    public string ZoneCode { get; set; } = string.Empty;

    public string ZoneName { get; set; } = string.Empty;

    // Bins per shelf (free / held : rack-management/bins)
    public List<OpeningStockRackShelfDto> Shelves { get; set; } = new();
}


public class OpeningStockRackShelfDto
{
    public int ShelfNumber { get; set; }

    public string ShelfLabel { get; set; } = string.Empty;

    public int BinCount { get; set; }
}


public class OpeningStockProductDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public string CategoryName { get; set; } = string.Empty;

    public string SubCategoryName { get; set; } = string.Empty;

    // Has an Inventory ledger (needed to post)
    public bool HasLedger { get; set; }

    // Cost of its latest batch (suggestion; its MRP below)
    public decimal LastCost { get; set; }

    public decimal LastMrp { get; set; }

    // VAT type of the product (SP : Spare Parts or Lubricants by
    // its category)
    public string VatType { get; set; } = string.Empty;

    // Default places (SP / AC)
    public List<OpeningStockShelfDto> Shelves { get; set; } = new();
}


public class OpeningStockShelfDto
{
    public long WarehouseId { get; set; }

    public long RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    public int BinNumber { get; set; }

    // A-03-05
    public string BinCode { get; set; } = string.Empty;
}


public class OpeningStockLedgerDto
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
}
