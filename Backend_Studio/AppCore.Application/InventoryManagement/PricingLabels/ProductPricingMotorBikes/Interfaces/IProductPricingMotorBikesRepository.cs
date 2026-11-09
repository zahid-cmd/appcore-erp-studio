//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing - Motor Bikes (price cards)
//===============================================================

public interface IProductPricingMotorBikesRepository
{
    Task<PagedResult<ProductPricingMotorBikesDto>> GetPagedAsync(
        AppCore.Application.InventoryManagement.InventoryDocumentPageRequest request);

    Task<ProductPricingMotorBikesDto?> GetByIdAsync(
        long id);

    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<ProductPricingMotorBikesDefaultsDto> GetDefaultsAsync();

    // The posted card in force per model for a supplier on a date
    // (Campaign before Regular); models with no card are left out
    Task<List<ProductPricingMotorBikesActiveDto>> GetActiveAsync(
        string supplierCode,
        DateOnly date,
        IReadOnlyCollection<long>? motorBikeIds = null);

    Task<ProductPricingMotorBikesSavedDto> CreateAsync(
        CreateProductPricingMotorBikesDto dto,
        long userId);

    Task<ProductPricingMotorBikesSavedDto> UpdateAsync(
        long id,
        UpdateProductPricingMotorBikesDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<ProductPricingMotorBikesSavedDto> PostAsync(
        long id,
        long userId);

    Task CancelAsync(
        long id,
        CancelProductPricingMotorBikesDto dto,
        long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(
        long id);
}
