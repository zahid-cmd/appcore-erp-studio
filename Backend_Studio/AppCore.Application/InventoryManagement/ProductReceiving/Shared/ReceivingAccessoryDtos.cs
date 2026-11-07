//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.ProductReceiving;


//===============================================================
// Motor Bike Receiving : accessories due from the supplier (Bike
// Accessory Schemes, Supplier source)
//===============================================================

// One due row of the purchase, as offered on the receiving
public class ReceivingAccessoryDueDto
{
    public long PurchaseAccessoryDueId { get; set; }

    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeName { get; set; } = string.Empty;

    // Additional / Promotional
    public string SchemeKind { get; set; } = string.Empty;

    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal QuantityDue { get; set; }

    public decimal ReceivedBefore { get; set; }

    public decimal QuantityClosed { get; set; }

    public decimal PendingQuantity { get; set; }
}


// Received now (Create)
public class CreateReceivingAccessoryDto
{
    public long PurchaseAccessoryDueId { get; set; }

    public decimal Quantity { get; set; }
}


// Received on a receiving (View)
public class ReceivingAccessoryLineDto
{
    public long PurchaseAccessoryDueId { get; set; }

    public string SchemeCode { get; set; } = string.Empty;

    public string SchemeKind { get; set; } = string.Empty;

    public long AccessoryId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string AccessoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public string BatchNo { get; set; } = string.Empty;
}


// Close Due : the rest is written off (the supplier will not send it)
public class CloseAccessoryDueDto
{
    public string? Reason { get; set; }
}
