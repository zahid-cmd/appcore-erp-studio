//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock : save a draft again (same fields as create)
//===============================================================

public class UpdateOpeningStockDto
    : CreateOpeningStockDto
{
    public long OpeningStockId { get; set; }
}
