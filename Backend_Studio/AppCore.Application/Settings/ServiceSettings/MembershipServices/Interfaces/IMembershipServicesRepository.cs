//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Membership Services Repository Interface
//
// Configure-only : rows are created, renamed, deleted and restored
// by Membership Cards. No Create / Delete / Restore here.
//===============================================================

public interface IMembershipServicesRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<MembershipServicesDto>> GetAllAsync();

    Task<MembershipServicesDto?> GetByIdAsync(
        long id);

    Task<MembershipServicesDefaultsDto> GetDefaultsAsync();


    //===========================================================
    // Configure (Service Value, status, remarks)
    //===========================================================

    Task UpdateAsync(
        UpdateMembershipServicesDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}