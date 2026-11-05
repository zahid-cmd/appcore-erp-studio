//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Rack Management Repository Interface
//===============================================================

public interface IRackManagementRepository
{
    //===========================================================
    // Racks
    //===========================================================

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
    // Next rack code / name, zones and categories for a
    // warehouse ('' when none given)
    //===========================================================

    Task<RackManagementDefaultsDto> GetDefaultsAsync(
        long warehouseId);


    //===========================================================
    // Bins : one rack (form preview) / every rack of a warehouse
    // (location modals). The given item's own bin is free.
    //===========================================================

    Task<RackMapDto?> GetBinsAsync(
        long id);

    Task<List<RackMapDto>> GetWarehouseBinsAsync(
        long warehouseId,
        long sparePartId,
        long accessoryId,
        bool activeOnly);


    //===========================================================
    // Zones
    //===========================================================

    Task<List<RackZoneDto>> GetZonesAsync(
        long warehouseId);

    Task<RackZoneDto?> GetZoneByIdAsync(
        long id);

    Task<RackZoneDefaultsDto> GetZoneDefaultsAsync(
        long warehouseId);

    Task<long> CreateZoneAsync(
        CreateRackZoneDto dto,
        long userId);

    Task UpdateZoneAsync(
        long id,
        UpdateRackZoneDto dto,
        long userId);

    Task DeleteZoneAsync(
        long id,
        long userId);

    // id 0 = the latest deleted zone; false when there is none
    Task<bool> RestoreZoneAsync(
        long id,
        long userId);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
