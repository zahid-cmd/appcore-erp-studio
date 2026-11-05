//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Policy Repository Interface
//===============================================================

public interface IServicePolicyRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ServicePolicyDto>> GetAllAsync();


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ServicePolicyDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateServicePolicyDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateServicePolicyDto dto,
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
    // Get Next Service Policy Code (SVP-nnn)
    //===========================================================

    Task<string> GetNextCodeAsync();


    //===========================================================
    // Next Associated Ledger Code under a sub group (preview)
    //===========================================================

    Task<string> GetNextLedgerCodeAsync(
        long subGroupId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ServicePolicyDefaultsDto> GetDefaultsAsync();
}