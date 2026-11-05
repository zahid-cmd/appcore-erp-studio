//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : save a draft (create)
//===============================================================

public class CreateOpeningStockDto
{
    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string OpeningDate { get; set; } = string.Empty;

    // The receiving branch (its code is in the number)
    public long BranchId { get; set; }

    public long WarehouseId { get; set; }

    // Cost / MRP (SP / AC)
    public string CostBasis { get; set; } = "Cost";

    // Opening Stock ledger (credit side)
    public string LedgerCode { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<CreateOpeningStockLineDto> Lines { get; set; } = new();

    // MB : one row per bike (ProductId = its line)
    public List<OpeningStockUnitDto> Units { get; set; } = new();
}


public class CreateOpeningStockLineDto
{
    public long ProductId { get; set; }

    public decimal Quantity { get; set; }

    // Typed cost : incl. VAT when the type's Includes Unclaimed VAT
    // switch is ON, else excl. VAT (MRP basis : not used)
    public decimal UnitCost { get; set; }

    public decimal Mrp { get; set; }

    public decimal MarginPercent { get; set; }

    public long? RackManagementId { get; set; }

    public int ShelfNumber { get; set; }

    // Bin on that shelf (0 with a rack and shelf = bin 1)
    public int BinNumber { get; set; }

    public bool SaveAsDefault { get; set; }

    public string ShortNotes { get; set; } = string.Empty;
}
