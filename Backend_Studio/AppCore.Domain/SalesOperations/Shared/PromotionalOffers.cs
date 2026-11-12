//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.SalesOperations.Shared;


//===============================================================
// Business Promotions : Promotional Offers (hand-written, tables
// made by PromotionalOffers_Engine.sql; NO Code Sync). One table
// for the three pages (Channel SalesCenter / ServiceCenter /
// AccessoryShop).
//===============================================================

public class PromotionalOffers
{
    public long PromotionalOfferId { get; set; }

    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string Channel { get; set; } = string.Empty;

    public string OfferNo { get; set; } = string.Empty;

    public string OfferName { get; set; } = string.Empty;

    public string OfferType { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string BrandName { get; set; } = string.Empty;

    // Company / Distributor
    public string FundedBy { get; set; } = "Company";

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool AllBranches { get; set; } = true;

    public string BranchIds { get; set; } = string.Empty;

    // Percent / Amount
    public string DiscountType { get; set; } = "Percent";

    public decimal DiscountValue { get; set; }

    public int FreeServiceCount { get; set; }

    public int ClaimDays { get; set; }

    public string Terms { get; set; } = string.Empty;

    // Draft / Active / Closed / Cancelled
    public string Status { get; set; } = "Draft";

    public string StatusReason { get; set; } = string.Empty;

    // The offer's own ledger (created on save; the invoices post
    // its discount to it)
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


public class PromotionalOfferTargets
{
    public long PromotionalOfferTargetId { get; set; }

    public long PromotionalOfferId { get; set; }

    public int LineNo { get; set; }

    // All / Category / SubCategory / Product
    public string TargetType { get; set; } = string.Empty;

    public long TargetId { get; set; }

    public string TargetName { get; set; } = string.Empty;

    // null = the offer's discount
    public string? DiscountType { get; set; }

    public decimal? DiscountValue { get; set; }

    // Exception : the item is left out of the offer
    public bool IsExcluded { get; set; }
}


public class PromotionalOfferPrizes
{
    public long PromotionalOfferPrizeId { get; set; }

    public long PromotionalOfferId { get; set; }

    public int LineNo { get; set; }

    public string PrizeName { get; set; } = string.Empty;

    // Cash / Item / Service
    public string PrizeKind { get; set; } = "Cash";

    public decimal PrizeValue { get; set; }

    public int Quantity { get; set; }

    public int GivenQuantity { get; set; }
}
