//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : one warehouse, one product type per document.
//   Draft → Posted (stock on hand + journal) → Cancelled.
//   Journal : Dr each product's Inventory ledger / Cr the Opening
//   Stock ledger (Posting Setup default, changeable).
//===============================================================

public class OpeningStock
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long OpeningStockId { get; set; }

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // Opening Voucher No : OS-<branch code>-<MB|SP|AC>-0001, given
    // on the first save (draft); the journal is posted under it
    public string OpeningNo { get; set; } = string.Empty;

    // The 0001 of the number : per branch and type, never reset,
    // never reused
    public int SequenceNo { get; set; }

    // The journal's voucher number, given on post
    // (OPMB-<branch digits>-<fy>-<mm>-00001)
    public string JournalNo { get; set; } = string.Empty;

    public DateOnly OpeningDate { get; set; }

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }

    public long WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    // Credit side of the journal
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    // Motor bikes (2026-11-10) : the supplier whose price card
    // (Product Pricing - Motor Bikes) gives the DP and MRP
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Cost (unit cost typed, excl. VAT) / MRP (SP / AC : cost =
    // MRP less margin, Purchase VAT taken out)
    public string CostBasis { get; set; } = "Cost";

    public decimal TotalQuantity { get; set; }

    public decimal TotalValue { get; set; }

    // Includes Unclaimed VAT (switch of the type at save / post) and
    // the VAT carried to the VAT Current Account
    public bool VatIncluded { get; set; }

    public decimal TotalVat { get; set; }

    // Draft / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}
