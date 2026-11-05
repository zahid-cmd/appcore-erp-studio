//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Barcode Management : settings of the page (switches + pickers)
//===============================================================

public class BarcodeSettingsDto
{
    public string PageType { get; set; } = string.Empty;

    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    // CFG-MOD-012-0014 : OFF = the MRP is never printed
    public bool PrintMrp { get; set; } = true;

    // CFG-MOD-012-0015 : {0} = the amount
    public string MrpFormat { get; set; } = "MRP {0}";

    public bool ShowName { get; set; } = true;

    public bool ShowPartNumber { get; set; } = true;

    public bool ShowBrand { get; set; } = true;

    // Name / Logo
    public string BrandAs { get; set; } = "Name";

    public bool ShowBatch { get; set; }

    public bool ShowDate { get; set; }

    public bool ShowCode128 { get; set; } = true;

    public bool ShowQr { get; set; } = true;

    // A4-3x8 / A4-4x10 / A4-5x13 / Roll-38x25 / Roll-50x25
    public string DefaultPaper { get; set; } = "A4-3x8";

    public bool KeepHistory { get; set; } = true;

    // Pickers : the brands / categories / products with stock in
    // hand of the type
    public List<BarcodeBrandDto> Brands { get; set; } = new();

    public List<BarcodeCategoryDto> Categories { get; set; } = new();

    public List<BarcodeProductDto> Products { get; set; } = new();
}

public class BarcodeBrandDto
{
    // Below 0 : no brand on the category; its name stands for it
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Brand Management image (relative path; '' = none)
    public string LogoPath { get; set; } = string.Empty;
}

public class BarcodeCategoryDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public long BrandId { get; set; }
}

public class BarcodeProductDto
{
    public long Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public long BrandId { get; set; }

    public long CategoryId { get; set; }

    // On hand
    public decimal Stock { get; set; }

    public int BatchCount { get; set; }
}


//===============================================================
// Source documents (posted price changes / purchases)
//===============================================================

public class BarcodeDocumentDto
{
    public long Id { get; set; }

    public string No { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string Date { get; set; } = string.Empty;

    // Supplier (purchase) / remarks or invoice (price change)
    public string Party { get; set; } = string.Empty;

    // Priced batches with stock behind it (the ones that get labels)
    public int Lines { get; set; }

    // Purchase : all received batches, priced or not (shows
    // "3 of 5 priced")
    public int TotalLines { get; set; }

    // Motor Bikes (purchase) : bikes on hand
    public int Units { get; set; }
}


//===============================================================
// Rows filter (POST rows / POST units)
//
//   Source pricechange : Id = the price change
//          purchase    : Id = the purchase
//          products    : BrandId / CategoryId / ProductId (one at
//                        least)
//          stock       : BrandId / CategoryId optional
//===============================================================

public class BarcodeRowsFilterDto
{
    public string? Type { get; set; }

    public string? Source { get; set; }

    public long Id { get; set; }

    public long BrandId { get; set; }

    public long CategoryId { get; set; }

    public long ProductId { get; set; }
}


//===============================================================
// One stock batch : one label design, Qty copies
//===============================================================

public class BarcodeRowDto
{
    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string Code { get; set; } = string.Empty;

    // The name on the label (part / accessory name; MB : the model)
    public string Name { get; set; } = string.Empty;

    public string PartNumber { get; set; } = string.Empty;

    public long BrandId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    public string BrandLogo { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Batch MRP, VAT inclusive (0 = unpriced : not saleable)
    public decimal Mrp { get; set; }

    // On hand
    public decimal Stock { get; set; }

    // Labels suggested by the source
    public int DefaultQty { get; set; }

    // <product code without hyphens>B<StockBatchId>
    public string BarcodeValue { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    // yyyy-MM-dd : the day the batch came in
    public string BatchDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;
}


//===============================================================
// One motor bike (hang-tag)
//===============================================================

public class BarcodeUnitDto
{
    public long UnitId { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string Color { get; set; } = string.Empty;

    public string ChassisNo { get; set; } = string.Empty;

    public string EngineNo { get; set; } = string.Empty;

    // Key / battery no of the unit (hang-tag, by switch)
    public string KeyNo { get; set; } = string.Empty;

    public string BatteryNo { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string BrandLogo { get; set; } = string.Empty;

    public decimal Mrp { get; set; }

    // The batch value (Code-128)
    public string BarcodeValue { get; set; } = string.Empty;

    // QR : the batch value | chassis no
    public string QrValue { get; set; } = string.Empty;

    public string SourceNo { get; set; } = string.Empty;

    // yyyy-MM-dd : stock-in date (else the batch date)
    public string StockInDate { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;
}


//===============================================================
// Print history (POST history)
//===============================================================

public class BarcodeHistoryInputDto
{
    public string? Type { get; set; }

    // Label / HangTag
    public string? LabelKind { get; set; }

    public string? Paper { get; set; }

    // PriceChange / Purchase / Products / Stock / Mixed
    public string? Source { get; set; }

    public long SourceId { get; set; }

    public string? SourceNo { get; set; }

    public int StartAt { get; set; } = 1;

    public bool PrintMrp { get; set; }

    public int SheetCount { get; set; }

    public List<BarcodeHistoryLineDto>? Lines { get; set; }
}

public class BarcodeHistoryLineDto
{
    public long StockBatchId { get; set; }

    // Hang-tag : the bike (0 = a batch label)
    public long UnitId { get; set; }

    public int Quantity { get; set; }
}

public class BarcodeHistorySavedDto
{
    // false : "Keep Barcode Print History" is OFF
    public bool Saved { get; set; }

    public long RunId { get; set; }

    public int Labels { get; set; }
}
