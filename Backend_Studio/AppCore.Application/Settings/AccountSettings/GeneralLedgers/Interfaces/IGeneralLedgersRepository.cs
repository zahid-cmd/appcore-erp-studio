//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.GeneralLedgers.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// General Ledgers Repository Interface
//===============================================================

public interface IGeneralLedgersRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<GeneralLedgersDto>> GetAllAsync();


    //===========================================================
    // Get Paged (the list page : one page, server side)
    //===========================================================

    Task<GeneralLedgersPagedResult> GetPagedAsync(
        GeneralLedgersPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<GeneralLedgersDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateGeneralLedgersDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateGeneralLedgersDto dto,
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
        long accountSubGroupId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<GeneralLedgersDefaultsDto> GetDefaultsAsync();
}