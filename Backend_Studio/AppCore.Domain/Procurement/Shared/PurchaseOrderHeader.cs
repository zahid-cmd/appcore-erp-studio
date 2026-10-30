//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.Shared;


//===============================================================
// Purchase Order header : the columns every Purchase Order page
// shares (MB / SP / AC). Each page keeps its own table and class
// (PurchaseOrdersMb / PurchaseOrdersSp / PurchaseOrdersAc), which
// only inherit from this one. Not a table on its own.
//
// Number : <PREFIX>-<BRANCH DIGITS>-<FY>-<MM>-<seq5>, taken on the
//          first save (voucher number service).
// Status : Draft → Approved → Placed → Completed
//          Placed → Closed Short (rest will not come)
//          Approved / Placed (nothing billed) → Cancelled
// VAT    : an estimate (the 6.3 decides at purchase entry).
// Nothing is posted to the ledgers.
//===============================================================

public abstract class PurchaseOrderHeader
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

    // POSP-010101-2627-10-00001
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

    // true = typed prices include VAT (always true on an MRP invoice)
    public bool PriceIncludesVat { get; set; }

    // How the supplier's invoice is written : MRP (lines at MRP
    // less profit) / DP (lines at dealer price). MB : always DP.
    public string InvoicePriceBasis { get; set; } = "DP";

    // What the profit % is taken on : DP (markup) / MRP (margin)
    public string ProfitBasis { get; set; } = "MRP";

    // New lines start with it ("Apply to all" resets the lines)
    public decimal DefaultProfitPercent { get; set; }

    // Discount at the bottom of the invoice : None / Percent / Amount
    public string AdditionalDiscountType { get; set; } = "None";

    // % or Tk as typed
    public decimal AdditionalDiscountValue { get; set; }

    // Tk, spread over the lines by value
    public decimal AdditionalDiscountAmount { get; set; }

    // Whole-taka rounding used at save : None / Nearest / Up / Down
    public string RoundingMethod { get; set; } = "None";

    // true = each line's payable in whole taka (largest remainder)
    public bool WholeTakaLines { get; set; }

    // Payable rounding (only when the lines are not whole-taka)
    public decimal RoundingAdjustment { get; set; }

    // VAT applicability on the order date (VAT Management
    // switches) and this invoice's own choice
    public bool PurchaseVatApplicable { get; set; } = true;

    public bool SalesVatApplicable { get; set; } = true;

    // "No VAT on this invoice" (supplier not VAT-registered)
    public bool NoVatInvoice { get; set; }

    // Purchase VAT applicable and not ticked "No VAT"
    public bool VatCharged { get; set; } = true;

    // Paid quantity
    public decimal TotalQuantity { get; set; }

    public decimal TotalFreeQuantity { get; set; }

    // Gross at MRP
    public decimal TotalMrp { get; set; }

    // Profit / commission (Total at MRP - Total at DP)
    public decimal TotalProfit { get; set; }

    // Total at DP (before the additional discount)
    public decimal TotalDp { get; set; }

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