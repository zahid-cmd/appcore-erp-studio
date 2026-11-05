//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer : save a draft again (same fields as create;
// the product type is fixed after the first save)
//===============================================================

public class UpdateProductTransferDto
    : CreateProductTransferDto
{
    // Optional : the route's id is the one used
    public long Id { get; set; }
}
