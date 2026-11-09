//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing - Motor Bikes : the price card (2026-11-09)
//
// One card = one supplier, one type (Regular / Campaign) and its
// dates; its lines give each model's DP (the real payable to the
// supplier) and MRP (the sale price, VAT inclusive). The card in
// force is the single source of the Motor Bike MRP; the purchase
// takes its DP / MRP from it.
//   No       : PC-MB-0001 (company-wide, never reused)
//   Draft    : saved, edited, deleted freely
//   Posted   : in force from Effective From (Campaign : to
//              Effective To)
//   Cancelled: with a reason (while no purchase used it)
//===============================================================

public class ProductPricingMotorBikes
{
    public long Id { get; set; }

    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();

    public string CardNo { get; set; } = string.Empty;

    public int SequenceNo { get; set; }

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Regular / Campaign
    public string CardType { get; set; } = "Regular";

    public DateOnly EffectiveFrom { get; set; }

    // Campaign only (last day included)
    public DateOnly? EffectiveTo { get; set; }

    // The supplier's declaration / circular no.
    public string Reference { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public int ProductCount { get; set; }

    // Draft / Posted / Cancelled
    public string Status { get; set; } = "Draft";

    public long? PostedBy { get; set; }

    public DateTime? PostedDate { get; set; }

    public long? CancelledBy { get; set; }

    public DateTime? CancelledDate { get; set; }

    public string CancelReason { get; set; } = string.Empty;

    public bool IsDeleted { get; set; }

    public long? DeletedBy { get; set; }

    public DateTime? DeletedDate { get; set; }

    public long CreatedBy { get; set; }

    public DateTime CreatedDate { get; set; }

    public long? ModifiedBy { get; set; }

    public DateTime? ModifiedDate { get; set; }
}


//===============================================================
// A card line : one model + colour
//===============================================================

public class ProductPricingMotorBikeLines
{
    public long Id { get; set; }

    public long CardId { get; set; }

    public int LineNo { get; set; }

    public long MotorBikeId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    // Real payable to the supplier per unit
    public decimal Dp { get; set; }

    // Sale price, VAT inclusive
    public decimal Mrp { get; set; }

    // Sales VAT % on Effective From
    public decimal VatRate { get; set; }

    // VAT inside the MRP
    public decimal VatInside { get; set; }

    // MRP - VAT inside
    public decimal NetSale { get; set; }

    // MRP - DP (VAT inclusive)
    public decimal Commission { get; set; }

    // Commission / MRP x 100
    public decimal CommissionPercent { get; set; }
}
