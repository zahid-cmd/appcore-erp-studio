//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders - MB (header)
//
// Each type has its own tables (Code Synchronization names) :
//   Purchase Orders - MB : PurchaseOrdersMb   (number POMB-…)
//   Purchase Orders - SP : PurchaseOrdersSp   (number POSP-…)
//   Purchase Orders - AC : PurchaseOrdersAc   (number POAC-…)
// PageType is kept on the row (always MB here) so the shared
// rules and print know the type.
//
// Number : <PREFIX>-<BRANCH DIGITS>-<FY>-<MM>-<seq5>, taken on the
//          first save (voucher number service).
// Status : Draft → Approved → Placed → Completed
//          Placed → Closed Short (rest will not come)
//          Approved / Placed (nothing billed) → Cancelled
// VAT    : an estimate (the 6.3 decides at purchase entry). Prices
//          are typed VAT inclusive or exclusive (PriceIncludesVat).
// Nothing is posted to the ledgers.
//===============================================================

public class PurchaseOrdersMb
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long PurchaseOrderId { get; set; }


    //===========================================================
    // Order
    //===========================================================

    // MB / SP / AC
    public string PageType { get; set; } = string.Empty;

    // POMB-010101-2627-10-00001
    public string OrderNo { get; set; } = string.Empty;

    public DateOnly OrderDate { get; set; }

    public DateOnly? ExpectedDate { get; set; }

    public long BranchId { get; set; }

    public string BranchCode { get; set; } = string.Empty;

    public string BranchName { get; set; } = string.Empty;

    public long FinancialYearId { get; set; }


    //===========================================================
    // Supplier (by code)
    //===========================================================

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;


    //===========================================================
    // Pricing & Totals
    //===========================================================

    // true = typed prices include VAT
    public bool PriceIncludesVat { get; set; }

    public decimal TotalQuantity { get; set; }

    // Without VAT
    public decimal TotalAmount { get; set; }

    public decimal TotalVat { get; set; }

    public decimal TotalPayable { get; set; }


    //===========================================================
    // Terms & Narration (required)
    //===========================================================

    public string Narration { get; set; } = string.Empty;


    //===========================================================
    // Workflow
    //===========================================================

    // Draft / Approved / Placed / Completed / Closed Short / Cancelled
    public string Status { get; set; } = string.Empty;

    // Close Short / Cancel reason
    public string CloseReason { get; set; } = string.Empty;

    public long? ApprovedBy { get; set; }

    public DateTime? ApprovedDate { get; set; }

    public long? PlacedBy { get; set; }

    public DateTime? PlacedDate { get; set; }

    public long? ClosedBy { get; set; }

    public DateTime? ClosedDate { get; set; }


    //===========================================================
    // Soft Delete (Draft only)
    //===========================================================

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }


    //===========================================================
    // Audit
    //===========================================================

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}