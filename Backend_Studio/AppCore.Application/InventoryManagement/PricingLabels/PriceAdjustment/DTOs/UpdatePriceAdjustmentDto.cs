//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment : save a draft again (same fields as create;
// the product type is fixed after the first save)
//===============================================================

public class UpdatePriceAdjustmentDto
    : CreatePriceAdjustmentDto
{
    // Optional : the route's id is the one used
    public long Id { get; set; }
}
