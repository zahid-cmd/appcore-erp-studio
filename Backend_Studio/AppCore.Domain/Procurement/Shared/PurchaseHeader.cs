//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Procurement.Shared;


//===============================================================
// Purchase (Mushak 6.3 entered as the purchase invoice) : the
// header columns shared by Purchases - MB / SP / AC. Each page has
// its own table (PurchasesMb / PurchasesSp / PurchasesAc).
//===============================================================

public abstract class PurchaseHeader
{
    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public long PurchaseId { get; set; }
    public string PageType { get; set; } = string.Empty;
    public string PurchaseNo { get; set; } = string.Empty;
    public DateOnly PurchaseDate { get; set; }
    public long BranchId { get; set; }
    public string BranchCode { get; set; } = string.Empty;
    public string BranchName { get; set; } = string.Empty;
    public long FinancialYearId { get; set; }

    // Supplier and its documents (Mushak 6.3)
    public string SupplierCode { get; set; } = string.Empty;
    public string SupplierName { get; set; } = string.Empty;
    public long? PurchaseOrderId { get; set; }
    public string OrderNo { get; set; } = string.Empty;
    public string SupplierInvoiceNo { get; set; } = string.Empty;
    public DateOnly? SupplierInvoiceDate { get; set; }
    public string MushakNo { get; set; } = string.Empty;
    public DateOnly? MushakDate { get; set; }
    public string DoReference { get; set; } = string.Empty;
    public string GatePassNo { get; set; } = string.Empty;

    // Warehouse (Products Received on Purchase ON)
    public long? WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;

    // Pricing terms (as on the Purchase Order engine)
    public bool PriceIncludesVat { get; set; } = true;
    public string InvoicePriceBasis { get; set; } = "DP";
    public string ProfitBasis { get; set; } = "MRP";
    public decimal DefaultProfitPercent { get; set; }
    public string AdditionalDiscountType { get; set; } = "None";
    public decimal AdditionalDiscountValue { get; set; }
    public decimal AdditionalDiscountAmount { get; set; }
    public string RoundingMethod { get; set; } = "None";
    public bool WholeTakaLines { get; set; }
    public decimal RoundingAdjustment { get; set; }
    public bool PurchaseVatApplicable { get; set; } = true;
    public bool SalesVatApplicable { get; set; } = true;
    public bool NoVatInvoice { get; set; }
    public bool VatCharged { get; set; } = true;

    // Totals
    public decimal TotalQuantity { get; set; }
    public decimal TotalFreeQuantity { get; set; }
    public decimal TotalMrp { get; set; }
    public decimal TotalProfit { get; set; }
    public decimal TotalDp { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalVat { get; set; }
    public decimal TotalVatClaimable { get; set; }
    public decimal TotalPayable { get; set; }
    // Motor bikes (2026-11-10) : 6.3 total - card DP (supplier
    // allowance), the campaign discount and its campaign name
    public decimal TotalAllowance { get; set; }
    public decimal TotalCampaignDiscount { get; set; }
    public string CampaignName { get; set; } = string.Empty;

    public string Narration { get; set; } = string.Empty;

    // Draft / Approved / Posted / Cancelled
    public string Status { get; set; } = string.Empty;
    public bool StockedIn { get; set; }
    public DateTime? StockedInDate { get; set; }
    public string VoucherNo { get; set; } = string.Empty;
    public string CancelReason { get; set; } = string.Empty;
    public long? ApprovedBy { get; set; }
    public DateTime? ApprovedDate { get; set; }
    public long? PostedBy { get; set; }
    public DateTime? PostedDate { get; set; }
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
