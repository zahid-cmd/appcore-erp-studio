//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Sales invoice line : shared by Sales Invoices - SP / AC / MB.
// The batches actually taken are in StockAllocations (posted);
// PlannedAllocations keeps the FIFO plan of a draft (JSON).
//===============================================================

public abstract class SalesInvoiceLine
{
    public long SalesInvoiceLineId { get; set; }
    public long SalesInvoiceId { get; set; }
    public int LineNo { get; set; }
    // Spare Parts / Lubricants / Accessories / Motor Bikes
    public string ProductType { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string PartNumber { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public decimal Quantity { get; set; }

    // Lowest MRP of the batches taken; "6 @ 500.00 + 4 @ 550.00"
    public decimal Mrp { get; set; }
    public string MrpText { get; set; } = string.Empty;
    public bool HasMixedMrp { get; set; }

    // Price edit (one price for the line)
    public bool PriceEdited { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal GrossAmount { get; set; }

    // Campaign or membership (the better one)
    public string DiscountSource { get; set; } = "None";
    public string DiscountLabel { get; set; } = string.Empty;
    public decimal CampaignMembershipPercent { get; set; }
    public decimal CampaignMembershipAmount { get; set; }

    // Special : the line % typed, and the amount (line % or the
    // line's share of the invoice special discount)
    public decimal SpecialDiscountPercent { get; set; }
    public decimal SpecialAmount { get; set; }

    public decimal NetAmount { get; set; }
    public decimal FractionalShare { get; set; }
    public decimal LineTotal { get; set; }

    // VAT : rate, VAT inside the gross, base VAT (paid at source)
    public decimal VatRate { get; set; }
    public decimal VatInside { get; set; }
    public decimal BaseVat { get; set; }

    // Cost of the units (FIFO) and the Price Adjustment share
    public decimal CostAmount { get; set; }
    public decimal PriceAdjustmentShare { get; set; }
    public bool BelowCost { get; set; }

    // Sold without stock : the part no batch covered
    public decimal UnallocatedQuantity { get; set; }

    // FIFO plan of a draft / approved invoice (JSON)
    public string PlannedAllocations { get; set; } = string.Empty;

    public decimal ReturnedQuantity { get; set; }
}


//===============================================================
// Sales Invoices - MB : a line sells one bike (chassis). The
// engine reads / writes these through this interface (only the
// MB lines table has the columns).
//===============================================================

public interface IMotorBikeSaleLine
{
    long? MotorBikeUnitId { get; set; }

    string ChassisNo { get; set; }

    string EngineNo { get; set; }

    string ColorName { get; set; }

    // Year of manufacture (BRTA Form-17)
    int? ManufactureYear { get; set; }

    // CKD documents of the chassis when sold : Yes / No
    string CkdStatus { get; set; }

    // Pending (sold, not handed over) / Delivered / Cancelled
    string DeliveryStatus { get; set; }

    DateOnly? DeliveredDate { get; set; }
}


//===============================================================
// Sales Invoices - MB header : Regular (one chassis) or
// Corporate (several chassis; a Corporate / Institution
// customer; switch 0073 and its date window). Only the MB header
// table has the column.
//===============================================================

public interface IMotorBikeSaleHeader
{
    string SaleType { get; set; }
}
