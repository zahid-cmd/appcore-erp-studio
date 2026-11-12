//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.Shared;


//===============================================================
// Business Promotions : Promotional Offers DTOs (the three pages
// Sales Center / Service Center / Accessory Shop share them)
//===============================================================

// List page query : Tab = all / Draft / Active / Closed /
// Cancelled; BrandId = the brand filter
public class PromotionalOfferPageRequest : PagedRequest
{
    public string? Tab { get; set; }

    public long? BrandId { get; set; }
}


public class PromotionalOfferTargetDto
{
    // All / Category / SubCategory / Product
    public string TargetType { get; set; } = string.Empty;

    public long TargetId { get; set; }

    public string TargetName { get; set; } = string.Empty;

    // '' / null = the offer's discount
    public string? DiscountType { get; set; }

    public decimal? DiscountValue { get; set; }

    // Exception : left out of the offer (no discount)
    public bool IsExcluded { get; set; }
}


public class PromotionalOfferPrizeDto
{
    public string PrizeName { get; set; } = string.Empty;

    // Cash / Item / Service
    public string PrizeKind { get; set; } = "Cash";

    public decimal PrizeValue { get; set; }

    // 0 = no limit
    public int Quantity { get; set; }

    public int GivenQuantity { get; set; }
}


public class SavePromotionalOfferDto
{
    public string OfferName { get; set; } = string.Empty;

    public string OfferType { get; set; } = string.Empty;

    public long? BrandManagementId { get; set; }

    public string FundedBy { get; set; } = "Company";

    // yyyy-MM-dd
    public string StartDate { get; set; } = string.Empty;

    public string EndDate { get; set; } = string.Empty;

    public bool AllBranches { get; set; } = true;

    public List<long> BranchIds { get; set; } = new();

    public string DiscountType { get; set; } = "Percent";

    public decimal DiscountValue { get; set; }

    public int FreeServiceCount { get; set; }

    public int ClaimDays { get; set; }

    public string Terms { get; set; } = string.Empty;

    public List<PromotionalOfferTargetDto> Targets { get; set; } = new();

    public List<PromotionalOfferPrizeDto> Prizes { get; set; } = new();
}


public class PromotionalOfferReasonDto
{
    public string Reason { get; set; } = string.Empty;
}


public class PromotionalOfferListItemDto
{
    public long PromotionalOfferId { get; set; }

    public Guid PublicId { get; set; }

    public string OfferNo { get; set; } = string.Empty;

    public string OfferName { get; set; } = string.Empty;

    public string OfferType { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string FundedBy { get; set; } = string.Empty;

    public string StartDate { get; set; } = string.Empty;

    public string EndDate { get; set; } = string.Empty;

    public string BenefitText { get; set; } = string.Empty;

    public string TargetsText { get; set; } = string.Empty;

    public string BranchesText { get; set; } = string.Empty;

    // Draft / Active / Closed / Cancelled; Running / Upcoming /
    // Ended for an Active offer by date
    public string Status { get; set; } = string.Empty;

    public string Phase { get; set; } = string.Empty;
}


public class PromotionalOfferDto : SavePromotionalOfferDto
{
    public long PromotionalOfferId { get; set; }

    public Guid PublicId { get; set; }

    public string Channel { get; set; } = string.Empty;

    public string OfferNo { get; set; } = string.Empty;

    public string BrandName { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Phase { get; set; } = string.Empty;

    public string StatusReason { get; set; } = string.Empty;

    // The offer's own ledger (created on save)
    public string LedgerCode { get; set; } = string.Empty;

    public string LedgerName { get; set; } = string.Empty;

    public string CreatedByName { get; set; } = string.Empty;

    public DateTime CreatedDate { get; set; }
}


public class PromotionalOfferOptionDto
{
    public long Id { get; set; }

    public string Name { get; set; } = string.Empty;

    // Category / sub category : its brand; product : its sub
    // category
    public long? ParentId { get; set; }

    public long? BrandId { get; set; }

    public string Note { get; set; } = string.Empty;
}


public class PromotionalOfferDefaultsDto
{
    public string Channel { get; set; } = string.Empty;

    public string NextOfferNo { get; set; } = string.Empty;

    public string Today { get; set; } = string.Empty;

    // "Motor Bikes" / "Spare Parts / Services" / "Accessories" :
    // only branches running it are listed (Business Configuration)
    public string BusinessLine { get; set; } = string.Empty;

    public List<string> OfferTypes { get; set; } = new();

    // Note : 'no Offer Adjustment ledger' when the brand has none
    public List<PromotionalOfferOptionDto> Brands { get; set; } = new();

    public List<PromotionalOfferOptionDto> Branches { get; set; } = new();

    // The channel's categories / sub categories (Sales Center :
    // bike categories / models)
    public List<PromotionalOfferOptionDto> Categories { get; set; } = new();

    public List<PromotionalOfferOptionDto> SubCategories { get; set; } = new();

    // Sales Center : the bikes (model + colour); Service Center :
    // the bike models for Free Service
    public List<PromotionalOfferOptionDto> Products { get; set; } = new();

    public List<PromotionalOfferOptionDto> BikeModels { get; set; } = new();
}


public class PromotionalOfferSavedDto
{
    public Guid PublicId { get; set; }

    public string OfferNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}
