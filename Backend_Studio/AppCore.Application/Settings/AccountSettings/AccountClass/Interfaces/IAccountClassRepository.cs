//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Account Class Repository Interface
//===============================================================

public interface IAccountClassRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<AccountClassDto>> GetAllAsync();


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<AccountClassDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateAccountClassDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateAccountClassDto dto,
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

    Task<string> GetNextCodeAsync(
        string classType,
        string classPrefix);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<AccountClassDefaultsDto> GetDefaultsAsync();
}