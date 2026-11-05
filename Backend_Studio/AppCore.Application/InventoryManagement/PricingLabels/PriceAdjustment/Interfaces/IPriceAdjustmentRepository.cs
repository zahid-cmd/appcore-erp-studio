//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.Platform.Accounting;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Price Adjustment repository
//===============================================================

public interface IPriceAdjustmentRepository
{
    // type '' = every type; deleted drafts included (Restore)
    Task<List<PriceAdjustmentListRowDto>> GetAllAsync(string? pageType);

    Task<PriceAdjustmentDto?> GetByIdAsync(long id);

    Task<PriceAdjustmentDefaultsDto> GetDefaultsAsync(string pageType);

    // Read only : the stock on the cut-off date and the amounts
    Task<PriceAdjustmentAnalysisDto> AnalyseAsync(PriceAdjustmentAnalyseInputDto input);

    // Draft : the new id
    Task<long> CreateAsync(CreatePriceAdjustmentDto dto, long branchId, long userId);

    Task UpdateAsync(long id, UpdatePriceAdjustmentDto dto, long userId);

    Task DeleteAsync(long id, long userId);

    Task RestoreAsync(long id, long userId);

    Task PostAsync(long id, long userId);

    Task CancelAsync(long id, CancelPriceAdjustmentDto dto, long userId);

    // Sales (not built yet) : releases the sold units of a batch
    // from the posted adjustments still holding units of it; adds
    // the release rows and returns the journal lines for the
    // sale's own voucher (the caller posts and saves)
    Task<List<VoucherPostingLine>> ReleaseOnSaleAsync(
        long stockBatchId,
        decimal quantity,
        string saleNo,
        DateOnly saleDate,
        long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(long id);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // One page of the list plus the tab / type counts
    Task<AppCore.Application.Common.Paging.PagedResult<PriceAdjustmentListRowDto>> GetPagedAsync(
        PriceAdjustmentPageRequest request);
}
