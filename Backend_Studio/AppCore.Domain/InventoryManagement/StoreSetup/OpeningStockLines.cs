//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock line : one product (once per document). On post
// it becomes one stock batch (SourceType Opening).
//===============================================================

public class OpeningStockLines
{
    public long OpeningStockLineId { get; set; }

    public long OpeningStockId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal LineValue { get; set; }

    // Maximum retail price (VAT inclusive)
    public decimal Mrp { get; set; }

    // MRP basis : supplier margin on MRP (%)
    public decimal MarginPercent { get; set; }

    // Cost incl. VAT, the rate taken out and the line's VAT
    // (VatIncluded; otherwise = UnitCost, 0, 0)
    public decimal GrossUnitCost { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatAmount { get; set; }

    // SP / AC : place in the warehouse
    public long? RackManagementId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public int ShelfNumber { get; set; }

    // Bin on that shelf (1 .. the shelf's BinCount; 0 = no place)
    public int BinNumber { get; set; }

    // Save the place as the product's default in the warehouse
    public bool SaveAsDefault { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    // Motor bikes : the supplier's price card, its DP and the
    // allowance (cost as typed incl. VAT - card DP, per line)
    public string CardNo { get; set; } = string.Empty;

    public decimal CardDp { get; set; }

    public decimal Allowance { get; set; }

    // Set on post
    public long? StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;
}
