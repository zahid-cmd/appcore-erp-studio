//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.PricingLabels;


//===============================================================
// Barcode print history (Barcode Management page)
//
// One run per Print : who, when, product type, paper and source;
// its lines are the batches (or motor bike units) printed with
// the number of labels. Kept only while "Keep Barcode Print
// History" (CFG-MOD-012-0025) is ON.
//===============================================================

public class BarcodePrintRuns
{
    public long BarcodePrintRunId { get; set; }

    // MB / SP / AC
    public string ProductType { get; set; } = string.Empty;

    // Label (sticker) / HangTag (motor bike unit)
    public string LabelKind { get; set; } = "Label";

    // A4-3x8 / A4-4x10 / A4-5x13 / Roll-38x25 / Roll-50x25 / Tag-A4-2x2
    public string PaperCode { get; set; } = string.Empty;

    // PriceChange / Purchase / Products / Stock (Mixed : rows of
    // more than one source)
    public string SourceType { get; set; } = string.Empty;

    public long SourceId { get; set; }

    public string SourceNo { get; set; } = string.Empty;

    // First label position used on the first sheet (1 = top left)
    public int StartAt { get; set; } = 1;

    public bool PrintMrp { get; set; }

    public int LineCount { get; set; }

    public int LabelCount { get; set; }

    public int SheetCount { get; set; }

    public long BranchId { get; set; }

    public long PrintedBy { get; set; }

    public string PrintedByName { get; set; } = string.Empty;

    public DateTime PrintedDate { get; set; }
}


//===============================================================
// One batch / bike of a print run
//===============================================================

public class BarcodePrintRunLines
{
    public long BarcodePrintRunLineId { get; set; }

    public long BarcodePrintRunId { get; set; }

    public int LineNo { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // Hang-tag : the bike (0 = a batch label)
    public long MotorBikeUnitId { get; set; }

    public string ChassisNo { get; set; } = string.Empty;

    // Labels printed
    public int Quantity { get; set; }

    public decimal Mrp { get; set; }

    public string BarcodeValue { get; set; } = string.Empty;
}
