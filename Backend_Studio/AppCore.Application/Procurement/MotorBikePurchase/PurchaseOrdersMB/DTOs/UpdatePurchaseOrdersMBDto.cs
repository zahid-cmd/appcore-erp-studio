//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Update Purchase Order (Draft only ; page type locked)
//===============================================================

public class UpdatePurchaseOrdersMbDto
    : CreatePurchaseOrdersMbDto
{
    public long PurchaseOrderId { get; set; }
}