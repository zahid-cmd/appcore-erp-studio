//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Barcode Management repository (utility page : read + print
// history)
//===============================================================

public interface IBarcodeManagementRepository
{
    // Switches of the page and the brand / category / product
    // pickers (products with stock in hand)
    Task<BarcodeSettingsDto> GetSettingsAsync(string pageType);

    // Posted price changes / purchases (source pricechange |
    // purchase) with batches behind them
    Task<List<BarcodeDocumentDto>> GetDocumentsAsync(string pageType, string source);

    // The batches of a source, one row each, with the labels
    // suggested
    Task<List<BarcodeRowDto>> GetRowsAsync(BarcodeRowsFilterDto filter);

    // Motor bikes on hand of a purchase (hang-tags)
    Task<List<BarcodeUnitDto>> GetUnitsByPurchaseAsync(long purchaseId);

    // Motor bikes on hand behind the batches of any source
    Task<List<BarcodeUnitDto>> GetUnitsAsync(BarcodeRowsFilterDto filter);

    // One print run (stored only while the history switch is ON)
    Task<BarcodeHistorySavedDto> SaveHistoryAsync(
        BarcodeHistoryInputDto input,
        long userId,
        string userName,
        long branchId);
}
