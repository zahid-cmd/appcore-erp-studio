//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// Card Charges Repository Interface
//
// Every operation is keyed by POS Account Id (the master).
//===============================================================

public interface ICardChargesRepository
{
    //===========================================================
    // Get All (one row per POS Account with card charges)
    //===========================================================

    Task<List<CardChargesDto>> GetAllAsync();


    //===========================================================
    // Get By POS Account
    //===========================================================

    Task<CardChargesDto?> GetByPosAccountAsync(
        long posAccountId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<CardChargesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Create
    //===========================================================

    Task CreateAsync(
        CreateCardChargesDto dto,
        long userId);


    //===========================================================
    // Update (replaces all lines of the POS Account)
    //===========================================================

    Task UpdateAsync(
        UpdateCardChargesDto dto,
        long userId);


    //===========================================================
    // Delete (soft-deletes all lines of the POS Account)
    //===========================================================

    Task DeleteAsync(
        long posAccountId,
        long userId);


    //===========================================================
    // Restore (most recently deleted POS Account)
    //===========================================================

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists (POS Account has active card charges)
    //===========================================================

    Task<bool> ExistsAsync(
        long posAccountId);
}