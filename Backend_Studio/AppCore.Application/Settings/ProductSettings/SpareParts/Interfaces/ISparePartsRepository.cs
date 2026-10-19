//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Spare Parts Repository Interface
//===============================================================

public interface ISparePartsRepository
{
    Task<List<SparePartsDto>> GetAllAsync();

    Task<SparePartsDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateSparePartsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateSparePartsDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Code preview for a sub category ('' codes when none given)
    //===========================================================

    Task<SparePartsDefaultsDto> GetDefaultsAsync(
        long productSubCategoryId);


    //===========================================================
    // Spare Part Image : store the new path (or '' to clear).
    // Returns the previous path so the old file can be removed.
    //===========================================================

    Task<string> SetImagePathAsync(
        long id,
        string imagePath,
        long userId);
}