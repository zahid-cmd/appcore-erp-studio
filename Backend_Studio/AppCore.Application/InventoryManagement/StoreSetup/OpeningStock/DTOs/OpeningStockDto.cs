//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : read
//===============================================================

public class OpeningStockDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long OpeningStockId { get; set; }

    public string PageType { get; set; } = string.Empty;

    public string OpeningNo { get; set; } = string.Empty;

    public string OpeningDate { get; set; } = string.Empty;

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public string CostBasis { get; set; } = "Cost";

    // Journal voucher number (posted)
    public string JournalNo { get; set; } = string.Empty;

    // Includes Unclaimed VAT : the VAT carried to the VAT Current Account
    public bool VatIncluded { get; set; }

    public decimal TotalVat { get; set; }

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    public decimal TotalValue { get; set; }

    public int LineCount { get; set; }

    // Draft / Posted / Cancelled
    public string Status { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CreatedDate { get; set; } = string.Empty;

    public List<OpeningStockLineDto> Lines { get; set; } = new();

    // MB : the bikes, by product
    public List<OpeningStockUnitDto> Units { get; set; } = new();
}


public class OpeningStockLineDto
{
    public long OpeningStockLineId { get; set; }

    public int LineNo { get; set; }

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }

    public decimal LineValue { get; set; }

    public decimal Mrp { get; set; }

    public decimal MarginPercent { get; set; }

    public decimal GrossUnitCost { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatAmount { get; set; }

    public long? RackManagementId { get; set; }

    public string RackCode { get; set; } = string.Empty;

    public int ShelfNumber { get; set; }

    // 0 = no place
    public int BinNumber { get; set; }

    // SLF-A-03 / A-03-05 ('' = no place)
    public string ShelfLabel { get; set; } = string.Empty;

    public string BinCode { get; set; } = string.Empty;

    public bool SaveAsDefault { get; set; }

    public string ShortNotes { get; set; } = string.Empty;

    public string BatchNo { get; set; } = string.Empty;

    public string CardNo { get; set; } = string.Empty;

    public decimal CardDp { get; set; }

    public decimal Allowance { get; set; }
}


// One bike (MB). ProductId ties it to its line (a product is on
// a document once).
public class OpeningStockUnitDto
{
    public long ProductId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    public string KeyNo { get; set; } = string.Empty;

    public string BatteryNo { get; set; } = string.Empty;
}


// After save / post
public class OpeningStockSavedDto
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; }

    public long OpeningStockId { get; set; }

    public string OpeningNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}


// Live bike-number check
public class OpeningStockUnitCheckDto
{
    public string PageType { get; set; } = string.Empty;

    // The document being edited (its own bikes are not "taken")
    public long OpeningStockId { get; set; }

    public List<OpeningStockUnitDto> Units { get; set; } = new();
}


public class OpeningStockUnitTakenDto
{
    public string Field { get; set; } = string.Empty;

    public string Value { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}


public class CancelOpeningStockDto
{
    public string Reason { get; set; } = string.Empty;
}
