//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management Repository Interface
//===============================================================

public interface IRackManagementRepository
{
    Task<List<RackManagementDto>> GetAllAsync();

    Task<RackManagementDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateRackManagementDto dto,
        long userId);

    Task UpdateAsync(
        UpdateRackManagementDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Next rack code for a warehouse ('' when none given)
    //===========================================================

    Task<RackManagementDefaultsDto> GetDefaultsAsync(
        long warehouseId);
}