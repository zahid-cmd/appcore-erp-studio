//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.HumanResourceManangement.HumanResourceSetup.Designation.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Designation Repository Interface
//===============================================================

public interface IDesignationRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<DesignationDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<DesignationDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateDesignationDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateDesignationDto dto,
        long userId);


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id,
        long userId);


    //===========================================================
    // Restore
    //===========================================================

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Get Next Code
    //===========================================================

    Task<string> GetNextCodeAsync();


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<DesignationDefaultsDto> GetDefaultsAsync();


    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
