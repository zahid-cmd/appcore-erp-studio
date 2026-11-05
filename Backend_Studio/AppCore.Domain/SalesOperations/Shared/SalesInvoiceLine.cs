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
