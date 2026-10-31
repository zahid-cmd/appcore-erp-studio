//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.ProductReceiving;


//===============================================================
// Product Receiving : header shared by Motor Bike / Spare Parts &
// Lubricants / Accessories Receiving (Goods Received Note).
//
// One receiving = one posted purchase invoice. It is posted when
// saved (no draft) : the received quantity moves from In Transit
// to On Hand in the warehouse. A purchase can be received in
// parts; it stays "under receiving" until nothing is in transit.
//===============================================================

public abstract class ReceivingHeader
{
    public long ReceivingId { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // RCMB / RCSP / RCAC-…
    public string ReceivingNo { get; set; } = string.Empty;

    public DateOnly ReceivingDate { get; set; }

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    // The purchase invoice received
    public long PurchaseId { get; set; }

    public string PurchaseNo { get; set; } = string.Empty;

    public DateOnly PurchaseDate { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    public string SupplierInvoiceNo { get; set; } = string.Empty;

    public string MushakNo { get; set; } = string.Empty;

    public string DoReference { get; set; } = string.Empty;

    public string GatePassNo { get; set; } = string.Empty;

    public string ReceivedBy { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public decimal TotalQuantity { get; set; }

    // Posted / Cancelled
    public string Status { get; set; } = "Posted";

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public bool IsDeleted { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
