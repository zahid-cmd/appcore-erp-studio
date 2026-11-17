//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.ServiceOperations;


//===============================================================
// Service Operations : Parts Outsourcing (hand-written, 2026-11-17;
// NEVER run Code Sync; table made by ServiceOperations_Outsourced_
// Parts.sql)
//
// JobCardOutsourcedParts   WOP-... : one part bought from a local
//                          vendor for ONE job card. No purchase
//                          order, no purchase invoice, no stock :
//                          the part goes straight to the job.
//===============================================================

public class JobCardOutsourcedParts
{
    public long JobCardOutsourcedPartId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string PurchaseNo { get; set; } = string.Empty;

    public DateOnly PurchaseDate { get; set; }

    public long BranchId { get; set; }

    public long JobCardId { get; set; }

    // SparePart / Accessory (a part of the product lists) or Other
    // (typed)
    public string ItemKind { get; set; } = "Other";

    public long? ItemId { get; set; }

    public string ItemCode { get; set; } = string.Empty;

    public string ItemName { get; set; } = string.Empty;

    // The vendor : a Supplier Profile, or a typed name
    public long? SupplierId { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string VendorName { get; set; } = string.Empty;

    // The cash memo / bill of the vendor
    public string BillNo { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    // What the vendor charges
    public decimal CostRate { get; set; }

    public decimal CostAmount { get; set; }

    // The price of Price Setup when the entry was made (a part of
    // the product lists)
    public decimal? Mrp { get; set; }

    // What the customer pays
    public decimal SellRate { get; set; }

    public decimal SellAmount { get; set; }

    // The ledgers of the journal (Dr WIP, Cr payable)
    public string WipLedgerCode { get; set; } = string.Empty;

    public string PayableLedgerCode { get; set; } = string.Empty;

    // Posted / Cancelled
    public string Status { get; set; } = "Posted";

    public string CancelReason { get; set; } = string.Empty;

    public string Note { get; set; } = string.Empty;

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
