//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing : save a draft again (same fields as create)
//===============================================================

public class UpdateProductPricingDto
    : CreateProductPricingDto
{
    public long ProductPricingId { get; set; }
}
