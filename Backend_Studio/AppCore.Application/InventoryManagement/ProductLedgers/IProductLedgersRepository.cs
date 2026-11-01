//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.ProductLedgers;


//===============================================================
// Product Ledgers repository (read only), shared by Motor Bikes
// Ledger / Spare Parts & Lubricants Ledger / Accessories Ledger.
//
// pageType : MB / SP / AC
// from / to : yyyy-MM-dd (empty = this month)
// branchId / warehouseId / categoryId / subCategoryId : 0 = all
// kind : SP only : "Spare Parts" / "Lubricants" (empty = both)
// canViewCost : false → every value is 0
//===============================================================

public interface IProductLedgersRepository
{
    Task<ProductLedgerFiltersDto> GetFiltersAsync(
        string pageType,
        bool canViewCost);

    // null when the product is not of the page type
    Task<ProductLedgerStatementDto?> GetStatementAsync(
        string pageType,
        long productId,
        string? from,
        string? to,
        long branchId,
        long warehouseId,
        bool showCancelled,
        bool withBikes,
        bool canViewCost);

    Task<ProductLedgerSummaryDto> GetSummaryAsync(
        string pageType,
        string? kind,
        long categoryId,
        long subCategoryId,
        string? from,
        string? to,
        long branchId,
        long warehouseId,
        bool showCancelled,
        bool canViewCost);
}
