//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Motor Bikes Repository Interface
//===============================================================

public interface IMotorBikesRepository
{
    Task<List<MotorBikesDto>> GetAllAsync();

    Task<MotorBikesDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateMotorBikesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateMotorBikesDto dto,
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

    Task<MotorBikesDefaultsDto> GetDefaultsAsync(
        long productSubCategoryId);


    //===========================================================
    // Motor Bike Image : store the new path (or '' to clear).
    // Returns the previous path so the old file can be removed.
    //===========================================================

    Task<string> SetImagePathAsync(
        long id,
        string imagePath,
        long userId);
}