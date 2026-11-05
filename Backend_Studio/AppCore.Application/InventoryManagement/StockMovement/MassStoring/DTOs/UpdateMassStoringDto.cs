//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing : save a draft again (same fields as create; the
// product type is fixed after the first save)
//===============================================================

public class UpdateMassStoringDto
    : CreateMassStoringDto
{
    // Optional : the route's id is the one used
    public long Id { get; set; }
}
