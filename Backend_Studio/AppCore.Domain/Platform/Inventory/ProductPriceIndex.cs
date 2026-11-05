//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Platform.Inventory;


//===============================================================
// Product Price Index : the declared MRP (VAT inclusive, the sale
// price) of a product over time. The current MRP of a product is
// its latest entry not cancelled (by effective date, then id),
// whether it has stock or not.
//   Written by : a posted MRP purchase invoice (Purchase), a posted
//   opening stock (Opening), a posted price change (PriceChange);
//   Initial = taken from the stock batches when the index started.
//   Cancelling the source document cancels its entries.
//===============================================================

public class ProductPriceIndex
{
    public long ProductPriceIndexId { get; set; }

    // MB / SP / AC
    public string ProductType { get; set; } = string.Empty;

    public long ProductId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public decimal Mrp { get; set; }

    public DateOnly EffectiveDate { get; set; }

    // Purchase / Opening / PriceChange / Initial
    public string SourceType { get; set; } = string.Empty;

    public long SourceId { get; set; }

    public string SourceNo { get; set; } = string.Empty;

    public bool IsCancelled { get; set; }

    public DateTime? CancelledDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}
