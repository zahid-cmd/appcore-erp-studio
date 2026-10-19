//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Membership Services Repository Interface
//===============================================================

public interface IMembershipServicesRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<MembershipServicesDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<MembershipServicesDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateMembershipServicesDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateMembershipServicesDto dto,
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
    // Get Defaults
    // (Membership Services sub categories with the next codes)
    //===========================================================

    Task<MembershipServicesDefaultsDto> GetDefaultsAsync();
}