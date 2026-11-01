//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.InventoryStatus;


//===============================================================
// Inventory Status repository : read-only stock of one product
// type, shared by Motor Bike Stock / Spare Parts & Lubricants
// Stock / Accessories Stock.
//
// pageType : MB / SP / AC
// branchId / warehouseId : 0 = all
// canViewCost : false → every cost / value is 0
//===============================================================

public interface IInventoryStatusRepository
{
    Task<InventoryStockListDto> GetStockAsync(
        string pageType,
        long branchId,
        long warehouseId,
        bool canViewCost);

    // null when the product is not of the page type
    Task<InventoryStockCardDto?> GetCardAsync(
        string pageType,
        long productId,
        long branchId,
        long warehouseId,
        bool canViewCost);

    // Motor bikes of posted purchases; search on chassis /
    // engine / key / battery / model
    Task<InventoryBikeListDto> GetBikesAsync(
        long branchId,
        string? search,
        bool canViewCost);
}
