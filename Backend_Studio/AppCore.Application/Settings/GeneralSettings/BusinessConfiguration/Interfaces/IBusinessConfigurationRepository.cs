//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.GeneralSettings;


//===============================================================
// Business Configuration Repository Interface
//===============================================================

public interface IBusinessConfigurationRepository
{
    //===========================================================
    // Extra grants (per branch)
    //===========================================================

    Task<List<BusinessConfigurationDto>> GetAllAsync();

    Task<BusinessConfigurationDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateBusinessConfigurationDto dto,
        long userId);

    Task UpdateAsync(
        UpdateBusinessConfigurationDto dto,
        long userId);

    // Revoke (soft delete)
    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Wing core business
    //===========================================================

    Task<List<WingBusinessLinesDto>> GetWingLinesAsync();

    Task UpdateWingLinesAsync(
        UpdateWingBusinessLinesDto dto,
        long userId);


    //===========================================================
    // Today's view
    //===========================================================

    Task<List<BranchBusinessLinesDto>> GetBranchOverviewAsync();

    // businessLine '' → every active warehouse with its lines
    Task<List<AllowedWarehouseDto>> GetAllowedWarehousesAsync(
        string? businessLine);
}