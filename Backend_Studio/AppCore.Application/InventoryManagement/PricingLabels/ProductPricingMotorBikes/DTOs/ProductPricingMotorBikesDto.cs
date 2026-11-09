//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing - Motor Bikes : DTOs (2026-11-09)
//===============================================================

// A card (list row and the page)
public class ProductPricingMotorBikesDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string CardNo { get; set; } = string.Empty;

    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;

    // Regular / Campaign
    public string CardType { get; set; } = string.Empty;

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = none)
    public string EffectiveTo { get; set; } = string.Empty;

    public string Reference { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public int ProductCount { get; set; }

    public string Status { get; set; } = string.Empty;

    public string PostedDate { get; set; } = string.Empty;

    public string CancelledDate { get; set; } = string.Empty;

    public string CancelReason { get; set; } = string.Empty;

    // In force today (posted, inside its dates, not replaced)
    public bool InForce { get; set; }

    public List<ProductPricingMotorBikesLineDto> Lines { get; set; } = new();
}


public class ProductPricingMotorBikesLineDto
{
    public int LineNo { get; set; }

    public long MotorBikeId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public decimal Dp { get; set; }

    public decimal Mrp { get; set; }

    public decimal VatRate { get; set; }

    public decimal VatInside { get; set; }

    public decimal NetSale { get; set; }

    public decimal Commission { get; set; }

    public decimal CommissionPercent { get; set; }
}


// Save / change a draft
public class CreateProductPricingMotorBikesDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string CardType { get; set; } = "Regular";

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd (Campaign only)
    public string EffectiveTo { get; set; } = string.Empty;

    public string Reference { get; set; } = string.Empty;

    public string Remarks { get; set; } = string.Empty;

    public List<ProductPricingMotorBikesLineInputDto> Lines { get; set; } = new();
}


public class UpdateProductPricingMotorBikesDto
    : CreateProductPricingMotorBikesDto
{
}


public class ProductPricingMotorBikesLineInputDto
{
    public long MotorBikeId { get; set; }

    public decimal Dp { get; set; }

    public decimal Mrp { get; set; }
}


public class CancelProductPricingMotorBikesDto
{
    public string Reason { get; set; } = string.Empty;
}


public class ProductPricingMotorBikesSavedDto
{
    public long Id { get; set; }

    public Guid PublicId { get; set; }

    public string CardNo { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;
}


// The page's lists
public class ProductPricingMotorBikesDefaultsDto
{
    // yyyy-MM-dd (business date)
    public string Today { get; set; } = string.Empty;

    public string NextNumber { get; set; } = string.Empty;

    public List<ProductPricingMotorBikesSupplierDto> Suppliers { get; set; } = new();

    public List<ProductPricingMotorBikesProductDto> Products { get; set; } = new();

    // Sales VAT % of Motor Bikes by date
    public List<ProductPricingMotorBikesVatRuleDto> VatRules { get; set; } = new();
}


public class ProductPricingMotorBikesSupplierDto
{
    public string SupplierCode { get; set; } = string.Empty;

    public string SupplierName { get; set; } = string.Empty;
}


public class ProductPricingMotorBikesProductDto
{
    public long MotorBikeId { get; set; }

    public string ProductCode { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public long ModelId { get; set; }

    public string ModelName { get; set; } = string.Empty;

    public string ColorName { get; set; } = string.Empty;

    public string ImagePath { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}


public class ProductPricingMotorBikesVatRuleDto
{
    public decimal Rate { get; set; }

    // yyyy-MM-dd
    public string EffectiveFrom { get; set; } = string.Empty;

    // yyyy-MM-dd ('' = open)
    public string ValidTo { get; set; } = string.Empty;
}


// The card in force for a supplier + model on a date
public class ProductPricingMotorBikesActiveDto
{
    public long MotorBikeId { get; set; }

    public long CardId { get; set; }

    public string CardNo { get; set; } = string.Empty;

    public string CardType { get; set; } = string.Empty;

    public string EffectiveFrom { get; set; } = string.Empty;

    public string EffectiveTo { get; set; } = string.Empty;

    public decimal Dp { get; set; }

    public decimal Mrp { get; set; }

    public decimal Commission { get; set; }
}
