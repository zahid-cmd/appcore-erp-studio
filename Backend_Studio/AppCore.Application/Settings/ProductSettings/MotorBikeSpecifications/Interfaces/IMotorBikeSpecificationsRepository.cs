//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bike Specifications Repository Interface
//===============================================================

public interface IMotorBikeSpecificationsRepository
{
    // Every live specification (lookups)
    Task<List<MotorBikeSpecificationsDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<MotorBikeSpecificationsDto>> GetPagedAsync(
        MotorBikeSpecificationsPageRequest request);

    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // With its rows
    Task<MotorBikeSpecificationsDto?> GetByIdAsync(
        long id);

    // The live, active specification of a bike model (null = none) :
    // used by Sales Invoices - MB, Registration and the website
    Task<MotorBikeSpecificationsDto?> GetForModelAsync(
        long bikeModelId);

    Task<long> CreateAsync(
        CreateMotorBikeSpecificationsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMotorBikeSpecificationsDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    // The most recently deleted specification; false when none
    Task<bool> RestoreAsync(
        long userId);

    Task<string> GetNextCodeAsync();

    Task<MotorBikeSpecificationsDefaultsDto> GetDefaultsAsync();
}
