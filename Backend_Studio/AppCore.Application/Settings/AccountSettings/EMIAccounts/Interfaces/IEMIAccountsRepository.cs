//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Accounts Repository Interface
//===============================================================

public interface IEmiAccountsRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<EmiAccountsDto>> GetAllAsync();

    Task<EmiAccountsDto?> GetByIdAsync(
        long id);

    Task<EmiAccountsDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateEmiAccountsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateEmiAccountsDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}