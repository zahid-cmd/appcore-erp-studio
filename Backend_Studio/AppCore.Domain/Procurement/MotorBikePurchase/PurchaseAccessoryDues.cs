//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Accessories due from the supplier on an MB Purchase : one row
// per purchase · scheme · accessory, worked out when the purchase
// is posted (Supplier Bike Accessory Schemes valid on the
// purchase date; bikes incl. free bikes × quantity per bike).
//
// Pending = Due − Received − Closed
// Status  : Pending / Received / Closed / Cancelled
//===============================================================

public class PurchaseAccessoryDues
{
    public long PurchaseAccessoryDueId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public DateOnly PurchaseDate { get; set; }

    public long BranchId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // The scheme that made it due
    public long BikeAccessorySchemeId { get; set; }

    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = string.Empty;

    // Accessory (Accessories product)
    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    // Bikes of the scheme's models on the purchase
    public decimal BikeQuantity { get; set; }

    public decimal QuantityDue { get; set; }

    public decimal QuantityReceived { get; set; }

    // Written off by Close Due
    public decimal QuantityClosed { get; set; }

    public string CloseReason { get; set; } = string.Empty;

    public long? ClosedBy { get; set; }

    public DateTime? ClosedDate { get; set; }

    public string Status { get; set; } = "Pending";

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// Accessories received on a Motor Bike Receiving : one row per
// due row received; its own zero-cost Accessories batch, on hand
// in the receiving's warehouse.
//===============================================================

public class PurchaseAccessoryReceipts
{
    public long PurchaseAccessoryReceiptId { get; set; }

    public long ReceivingId { get; set; }

    public string ReceivingNo { get; set; } = string.Empty;

    public DateOnly ReceivingDate { get; set; }

    public long PurchaseAccessoryDueId { get; set; }

    public long PurchaseId { get; set; }

    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public long StockBatchId { get; set; }

    public string BatchNo { get; set; } = string.Empty;

    public long WarehouseId { get; set; }

    // Receiving (Motor Bike Receiving : ReceivingId / No = the
    // receiving) / Purchase (received with the purchase, Products
    // Received on Purchase ON : ReceivingId / No = the purchase)
    public string ReceivedOn { get; set; } = "Receiving";

    // Set when its receiving is cancelled (kept for the record)
    public bool IsCancelled { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }
}


//===============================================================
// A purchase's free accessories to receive with it (draft) :
// Products Received on Purchase ON. One row per scheme ·
// accessory; replaced on every draft save, taken in on Post.
//===============================================================

public class PurchaseAccessoryTakes
{
    public long PurchaseAccessoryTakeId { get; set; }
    public long PurchaseId { get; set; }
    public long BikeAccessorySchemeId { get; set; }
    public long AccessoryId { get; set; }
    public decimal Quantity { get; set; }
    public long CreatedBy { get; set; }
    public DateTime CreatedDate { get; set; }
}
