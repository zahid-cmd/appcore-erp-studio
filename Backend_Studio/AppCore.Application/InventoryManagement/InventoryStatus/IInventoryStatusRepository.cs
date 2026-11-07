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
    // canViewCostVat : also the cost incl. VAT ("View Cost incl.
    // VAT"; only with canViewCost)
    Task<InventoryStockListDto> GetStockAsync(
        string pageType,
        long branchId,
        long warehouseId,
        bool canViewCost,
        bool canViewCostVat = false);

    // Motor Bike Stock › Free Accessories : Accessories products
    // used as Additional / Promotional Accessories (ProductKind
    // "Free Accessories")
    Task<InventoryStockListDto> GetBikeAccessoriesStockAsync(
        long branchId,
        long warehouseId,
        bool canViewCost);

    // Stock card of one of them (null when it is not one)
    Task<InventoryStockCardDto?> GetBikeAccessoryCardAsync(
        long productId,
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


    //===========================================================
    // Edit Bike Numbers (MB)
    //===========================================================

    // The three switches
    Task<InventoryBikeEditRulesDto> GetBikeEditRulesAsync();

    // Live check : numbers other live bikes already carry (same
    // rule as Purchases / Receiving)
    Task<List<InventoryBikeNumberTakenDto>> CheckBikeNumbersAsync(
        InventoryBikeNumbersDto dto);

    // Save : switches, sold rule and uniqueness checked again;
    // copies on transfers, labels, service vehicles, memberships
    // and service enquiries follow; one history row
    Task UpdateBikeNumbersAsync(
        InventoryBikeNumbersDto dto,
        long userId);

    // History of the bike number edits (newest first)
    Task<List<InventoryBikeHistoryDto>> GetBikeHistoryAsync();
}
