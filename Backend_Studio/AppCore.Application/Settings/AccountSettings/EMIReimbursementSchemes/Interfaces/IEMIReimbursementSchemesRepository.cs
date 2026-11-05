//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes Repository Interface
//===============================================================

public interface IEmiReimbursementSchemesRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<EmiReimbursementSchemesDto>> GetAllAsync();


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);

    Task<EmiReimbursementSchemesDto?> GetByIdAsync(
        long id);

    Task<EmiReimbursementSchemesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Write
    //===========================================================

    Task<long> CreateAsync(
        CreateEmiReimbursementSchemesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateEmiReimbursementSchemesDto dto,
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